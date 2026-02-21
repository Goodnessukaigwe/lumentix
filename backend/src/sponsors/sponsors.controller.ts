import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { ContributionsService } from './contributions.service';
import { CreateSponsorTierDto } from './dto/create-sponsor-tier.dto';
import { UpdateSponsorTierDto } from './dto/update-sponsor-tier.dto';
import { ContributionIntentDto } from './dto/contribution-intent.dto';
import { ConfirmContributionDto } from './dto/confirm-contribution.dto';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('events/:eventId/tiers')
@UseGuards(RolesGuard)
export class SponsorsController {
  constructor(
    private readonly sponsorsService: SponsorsService,
    private readonly contributionsService: ContributionsService,
  ) {}

  // ── Tier management (organizer only) ─────────────────────────────────────

  @Post()
  @Roles(Role.ORGANIZER)
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateSponsorTierDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sponsorsService.createTier(eventId, dto, req.user.id);
  }

  @Get()
  list(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.sponsorsService.listTiers(eventId);
  }

  @Put(':id')
  @Roles(Role.ORGANIZER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSponsorTierDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sponsorsService.updateTier(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sponsorsService.deleteTier(id, req.user.id);
  }

  // ── Contribution flow (sponsor) ───────────────────────────────────────────

  /**
   * POST /events/:eventId/tiers/contribute/intent
   * Sponsor selects a tier and receives the escrow wallet + amount to pay.
   */
  @Post('contribute/intent')
  @Roles(Role.SPONSOR)
  createIntent(
    @Body() dto: ContributionIntentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contributionsService.createIntent(dto.tierId, req.user.id);
  }

  /**
   * POST /events/:eventId/tiers/contribute/confirm
   * Sponsor submits the on-chain transaction hash after broadcasting.
   */
  @Post('contribute/confirm')
  @Roles(Role.SPONSOR)
  confirmContribution(@Body() dto: ConfirmContributionDto) {
    return this.contributionsService.confirmContribution(dto.transactionHash);
  }
}
