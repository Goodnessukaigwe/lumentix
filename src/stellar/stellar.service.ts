import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';

export type PaymentCallback = (
  payment: Horizon.ServerApi.PaymentOperationRecord,
) => void;

@Injectable()
export class StellarService implements OnModuleDestroy {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;
  private streamCloser: (() => void) | null = null;

  constructor(private readonly configService: ConfigService) {
    const horizonUrl =
      this.configService.get<string>('stellar.horizonUrl') ??
      'https://horizon-testnet.stellar.org';
    this.networkPassphrase =
      this.configService.get<string>('stellar.networkPassphrase') ??
      'Test SDF Network ; September 2015';

    this.server = new Horizon.Server(horizonUrl);
    this.logger.log(`StellarService initialised → ${horizonUrl}`);
  }

  /**
   * Fetch account details (balances, sequence number, etc.)
   */
  async getAccount(publicKey: string): Promise<Horizon.AccountResponse> {
    this.logger.debug(`getAccount: ${publicKey}`);
    return this.server.loadAccount(publicKey);
  }

  /**
   * Submit a base-64 encoded transaction XDR to the network.
   */
  async submitTransaction(
    xdr: string,
  ): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
    this.logger.debug('submitTransaction');
    const tx: Transaction | FeeBumpTransaction = new Transaction(
      xdr,
      this.networkPassphrase,
    );
    return this.server.submitTransaction(tx);
  }

  /**
   * Fetch a single transaction by its hash.
   */
  async getTransaction(
    hash: string,
  ): Promise<Horizon.ServerApi.TransactionRecord> {
    this.logger.debug(`getTransaction: ${hash}`);
    return this.server.transactions().transaction(hash).call();
  }

  /**
   * Open an SSE stream for payments.  Calls `callback` for every payment
   * event and returns a close function.  The stream is also closed
   * automatically when the module is destroyed.
   */
  streamPayments(callback: PaymentCallback): () => void {
    this.logger.debug('streamPayments: opening stream');

    const close = this.server
      .payments()
      .cursor('now')
      .stream({
        onmessage: (payment) => {
          callback(payment as Horizon.ServerApi.PaymentOperationRecord);
        },
        onerror: (error) => {
          this.logger.error('streamPayments error', error);
        },
      });

    this.streamCloser = close;
    return close;
  }

  onModuleDestroy(): void {
    if (this.streamCloser) {
      this.logger.log('Closing Stellar payment stream');
      this.streamCloser();
    }
  }
}
