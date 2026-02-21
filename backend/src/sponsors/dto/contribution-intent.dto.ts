import { IsUUID } from 'class-validator';

export class ContributionIntentDto {
  @IsUUID()
  tierId: string;
}
