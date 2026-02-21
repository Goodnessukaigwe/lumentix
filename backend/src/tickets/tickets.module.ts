import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './entities/ticket.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';


import { PaymentsModule } from '../payments/payments.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TicketEntity]),
        PaymentsModule,
        StellarModule,
    ],
    providers: [TicketsService],
    controllers: [TicketsController],
    exports: [TicketsService],
})
export class TicketsModule { }