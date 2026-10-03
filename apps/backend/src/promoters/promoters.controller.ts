import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { PromotersService } from './promoters.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@nutrideli/shared-types';

@Controller('promoters')
@UseGuards(RolesGuard)
export class PromotersController {
  constructor(private readonly promotersService: PromotersService) {}

  @Get('my-stats')
  @Roles(UserRole.PROMOTOR)
  async getMyStats(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return await this.promotersService.getMyStats(userId);
  }

  @Put('my-payout-details')
  @Roles(UserRole.PROMOTOR)
  async updatePayoutDetails(
    @Req() req: any,
    @Body() body: {
      pagoMovilPhone?: string;
      pagoMovilCedula?: string;
      pagoMovilBank?: string;
      binancePayId?: string;
    },
  ) {
    const userId = req.user.id || req.user.sub;
    return await this.promotersService.updatePayoutDetails(userId, body);
  }
}

