import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SponsorsService } from './sponsors.service';
import { SponsorsController } from './sponsors.controller';
import { ContributionsService } from './contributions.service';
import { SponsorTier } from './entities/sponsor-tier.entity';
import { SponsorContribution } from './entities/sponsor-contribution.entity';
import { EventsModule } from 'src/events/events.module';
import { StellarModule } from 'src/stellar/stellar.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SponsorTier, SponsorContribution]),
    EventsModule,
    StellarModule,
    AuditModule,
  ],
  controllers: [SponsorsController],
  providers: [SponsorsService, ContributionsService],
  exports: [SponsorsService, ContributionsService],
})
export class SponsorsModule {}
