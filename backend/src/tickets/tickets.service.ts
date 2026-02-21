import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TicketEntity } from './entities/ticket.entity';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/entities/payment.entity';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class TicketsService {
    constructor(
        @InjectRepository(TicketEntity)
        private readonly ticketRepo: Repository<TicketEntity>,
        private readonly paymentsService: PaymentsService,
        private readonly stellarService: StellarService,
    ) { }

    async issueTicket(paymentId: string): Promise<TicketEntity> {
        const payment = await this.paymentsService.getPaymentById(paymentId);

        if (payment.status !== PaymentStatus.CONFIRMED) {
            throw new BadRequestException('Payment not confirmed');
        }

        if (!payment.transactionHash) {
            throw new BadRequestException('Payment has no transaction hash');
        }


        const existing = await this.ticketRepo.findOne({
            where: { transactionHash: payment.transactionHash },
        });
        if (existing) return existing;


        const tx = await this.stellarService.getTransaction(payment.transactionHash);

        const memoValue: string | undefined =
            typeof tx.memo === 'string' ? tx.memo : undefined;

        if (!memoValue) {
            throw new BadRequestException(
                'Transaction is missing memo. Cannot verify payment reference.',
            );
        }

        if (memoValue !== payment.id) {
            throw new BadRequestException(
                `Transaction memo does not match paymentId. Expected "${payment.id}", got "${memoValue}".`,
            );
        }

        const ticket = this.ticketRepo.create({
            eventId: payment.eventId,
            ownerId: payment.userId,
            assetCode: payment.currency,
            transactionHash: payment.transactionHash,
            status: 'valid',
        });

        return this.ticketRepo.save(ticket);
    }

    async transferTicket(
        ticketId: string,
        callerOwnerId: string,
        newOwnerId: string,
    ): Promise<TicketEntity> {
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        if (ticket.ownerId !== callerOwnerId) {
            throw new ForbiddenException('Not ticket owner');
        }

        if (ticket.status !== 'valid') {
            throw new BadRequestException('Ticket not transferable');
        }

        ticket.ownerId = newOwnerId;
        return this.ticketRepo.save(ticket);
    }
}