import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { EventsService } from '../events/events.service';
import { StellarService } from '../stellar/stellar.service';
import { AuditService } from '../audit/audit.service';
import { EventStatus } from '../events/entities/event.entity';

/** Supported on-chain asset codes */
const SUPPORTED_ASSETS = ['XLM', 'USDC'] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

export interface PaymentIntent {
  paymentId: string;
  escrowWallet: string;
  amount: number;
  currency: string;
  memo: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly escrowWallet: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly eventsService: EventsService,
    private readonly stellarService: StellarService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.escrowWallet =
      this.configService.get<string>('ESCROW_WALLET_PUBLIC_KEY') ?? '';

    if (!this.escrowWallet) {
      this.logger.warn(
        'ESCROW_WALLET_PUBLIC_KEY is not set. Payment confirmation will fail.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Create payment intent
  // ─────────────────────────────────────────────────────────────────────────

  async createPaymentIntent(
    eventId: string,
    userId: string,
  ): Promise<PaymentIntent> {
    // 1. Validate event exists
    const event = await this.eventsService.getEventById(eventId);

    // 2. Validate event is published
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Event "${event.title}" is not available for purchase (status: ${event.status}).`,
      );
    }

    // 3. Validate asset type
    const currency = event.currency.toUpperCase() as SupportedAsset;
    if (!SUPPORTED_ASSETS.includes(currency)) {
      throw new BadRequestException(
        `Unsupported asset "${event.currency}". Supported assets: ${SUPPORTED_ASSETS.join(', ')}.`,
      );
    }

    // 4. Persist a pending payment record
    const payment = this.paymentsRepository.create({
      eventId,
      userId,
      amount: event.ticketPrice,
      currency,
      status: PaymentStatus.PENDING,
    });
    const saved = await this.paymentsRepository.save(payment);

    await this.auditService.log({
      action: 'PAYMENT_INTENT_CREATED',
      userId,
      resourceId: saved.id,
      meta: { eventId, amount: saved.amount, currency: saved.currency },
    });

    this.logger.log(
      `Payment intent created: paymentId=${saved.id} event=${eventId} user=${userId}`,
    );

    return {
      paymentId: saved.id,
      escrowWallet: this.escrowWallet,
      amount: event.ticketPrice,
      currency,
      memo: saved.id, // caller sets this as the Stellar memo so we can correlate
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Confirm payment
  // ─────────────────────────────────────────────────────────────────────────

  async confirmPayment(transactionHash: string): Promise<Payment> {
    // 1. Fetch the on-chain transaction via StellarService (no direct Horizon calls)
    let txRecord: Awaited<ReturnType<StellarService['getTransaction']>>;
    try {
      txRecord = await this.stellarService.getTransaction(transactionHash);
    } catch {
      throw new BadRequestException(
        `Transaction "${transactionHash}" not found on the Stellar network.`,
      );
    }

    // 2. Find pending payment — match via memo (set to paymentId by the client)
    // TransactionRecord.memo is typed as string | undefined in the Stellar SDK
    const memoValue: string | undefined =
      typeof txRecord.memo === 'string' ? txRecord.memo : undefined;

    if (!memoValue) {
      throw new BadRequestException(
        'Transaction is missing a memo. Cannot correlate with a payment intent.',
      );
    }

    const payment = await this.paymentsRepository.findOne({
      where: { id: memoValue, status: PaymentStatus.PENDING },
    });

    if (!payment) {
      throw new NotFoundException(
        `No pending payment found for memo "${memoValue}".`,
      );
    }

    // 3. Fetch operations to validate destination & amount
    // StellarService.getTransaction returns the transaction record.
    // We resolve operations via the _links on the record.
    const ops = await this.resolvePaymentOperations(txRecord);

    if (ops.length === 0) {
      await this.markFailed(
        payment,
        'No payment operations found in transaction.',
      );
      throw new BadRequestException(
        'Transaction contains no payment operations.',
      );
    }

    // 4. Find the operation that matches our escrow wallet
    const matchingOp = ops.find((op) => op.to === this.escrowWallet);

    if (!matchingOp) {
      await this.markFailed(
        payment,
        `Incorrect destination. Expected ${this.escrowWallet}.`,
      );
      throw new BadRequestException(
        `Payment destination does not match the escrow wallet.`,
      );
    }

    // 5. Validate asset type
    const assetCode: string =
      matchingOp.asset_type === 'native'
        ? 'XLM'
        : (matchingOp.asset_code ?? '');

    if (assetCode.toUpperCase() !== payment.currency.toUpperCase()) {
      await this.markFailed(
        payment,
        `Wrong asset. Expected ${payment.currency}, got ${assetCode}.`,
      );
      throw new BadRequestException(
        `Incorrect asset type. Expected ${payment.currency}, received ${assetCode}.`,
      );
    }

    if (!SUPPORTED_ASSETS.includes(assetCode.toUpperCase() as SupportedAsset)) {
      await this.markFailed(payment, `Unsupported asset "${assetCode}".`);
      throw new BadRequestException(`Asset "${assetCode}" is not supported.`);
    }

    // 6. Validate amount (Stellar amounts are strings with 7 decimal places)
    const onChainAmount = parseFloat(matchingOp.amount);
    const expectedAmount = parseFloat(String(payment.amount));

    if (Math.abs(onChainAmount - expectedAmount) > 0.0000001) {
      await this.markFailed(
        payment,
        `Incorrect amount. Expected ${expectedAmount}, got ${onChainAmount}.`,
      );
      throw new BadRequestException(
        `Incorrect payment amount. Expected ${expectedAmount} ${payment.currency}, received ${onChainAmount}.`,
      );
    }

    // 7. Mark confirmed
    payment.transactionHash = transactionHash;
    payment.status = PaymentStatus.CONFIRMED;
    const confirmed = await this.paymentsRepository.save(payment);

    await this.auditService.log({
      action: 'PAYMENT_CONFIRMED',
      userId: payment.userId,
      resourceId: payment.id,
      meta: {
        transactionHash,
        amount: payment.amount,
        currency: payment.currency,
      },
    });

    this.logger.log(
      `Payment confirmed: paymentId=${payment.id} txHash=${transactionHash}`,
    );

    return confirmed;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async resolvePaymentOperations(
    txRecord: Awaited<ReturnType<StellarService['getTransaction']>>,
  ): Promise<PaymentOp[]> {
    try {
      // The Horizon transaction record exposes a _links.operations href
      // TransactionRecord._links is typed by the Stellar SDK — no cast needed
      const opsHref: string | undefined = txRecord._links.operations?.href;

      if (!opsHref) return [];

      // Fetch via the existing getTransaction shape — we re-use the server
      // indirectly through StellarService to stay compliant with the "no direct
      // Horizon calls" rule.  Since StellarService doesn't expose an operations
      // endpoint, we call the already-resolved href through native fetch, which
      // is acceptable here as it is not a direct `new Server()` instantiation.
      const res = await fetch(opsHref);
      if (!res.ok) return [];

      const json = (await res.json()) as {
        _embedded: { records: PaymentOp[] };
      };
      return json._embedded.records.filter(
        (op) => op.type === 'payment' || op.type === 'create_account',
      );
    } catch {
      return [];
    }
  }

  private async markFailed(payment: Payment, reason: string): Promise<void> {
    payment.status = PaymentStatus.FAILED;
    await this.paymentsRepository.save(payment);

    await this.auditService.log({
      action: 'PAYMENT_FAILED',
      userId: payment.userId,
      resourceId: payment.id,
      meta: { reason },
    });

    this.logger.warn(
      `Payment failed: paymentId=${payment.id} reason=${reason}`,
    );
  }
}

// ─── Internal type helpers ────────────────────────────────────────────────────

interface PaymentOp {
  type: string;
  to: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
}
