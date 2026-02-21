import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmContributionDto {
  @IsString()
  @IsNotEmpty()
  transactionHash: string;
}
