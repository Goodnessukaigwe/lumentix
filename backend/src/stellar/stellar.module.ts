import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { stellarConfig } from './stellar.config';
import { StellarService } from './stellar.service';

@Module({
  imports: [ConfigModule.forFeature(stellarConfig)],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
