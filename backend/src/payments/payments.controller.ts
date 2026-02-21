import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/intent
   * Authenticated user requests a payment intent for an event.
   * Returns the escrow wallet address, amount, and a memo to include in the tx.
   */
  @Post('intent')
  createIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.createPaymentIntent(dto.eventId, req.user.id);
  }

  /**
   * POST /payments/confirm
   * Submit the on-chain transaction hash after broadcasting the payment.
   * PaymentsService verifies destination, asset type, and amount via StellarService.
   */
  @Post('confirm')
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto.transactionHash);
  }
}
