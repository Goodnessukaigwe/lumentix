import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from 'src/audit/audit.module';
import { Event } from 'src/events/entities/event.entity';
import { StellarModule } from 'src/stellar';
import { EscrowService } from './services/escrow.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), StellarModule, AuditModule],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
