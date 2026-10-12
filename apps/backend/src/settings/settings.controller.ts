import { Controller, Get, Put, Post, Delete, Body, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';
import { safeImageUploadOptions } from '../common/utils/multer-options';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@Request() req) {
    return this.settingsService.getSettings(req.user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put()
  updateSettings(@Request() req, @Body() dto: any) {
    return this.settingsService.updateSettings(req.user.tenantId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', safeImageUploadOptions))
  uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.settingsService.uploadLogo(req.user.tenantId, file);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('logo')
  deleteLogo(@Request() req) {
    return this.settingsService.deleteLogo(req.user.tenantId);
  }

  @Get('exchange-rate')
  getRate(@Request() req: any) {
    return this.settingsService.getExchangeRate(req.user?.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('exchange-rate')
  updateRate(@Request() req: any, @Body() body: any) {
    const rate = typeof body?.rate === 'number' ? body.rate : (typeof body === 'number' ? body : undefined);
    const mode = body?.mode;
    const manualRate = body?.manualRate;
    return this.settingsService.updateExchangeRate(rate, req.user?.tenantId, mode, manualRate);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('sync-rates')
  syncRates(@Request() req: any) {
    return this.settingsService.forceSyncRates(req.user?.tenantId);
  }
}


