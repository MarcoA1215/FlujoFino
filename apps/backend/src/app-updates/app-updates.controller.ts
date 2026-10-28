import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AppUpdatesService } from './app-updates.service';
import { CreateAppUpdateDto } from './dto/create-app-update.dto';
import { UpdateAppUpdateDto } from './dto/update-app-update.dto';
import { SuperAdminGuard } from '../superadmin/superadmin.guard';
import { Public } from '../auth/public.decorator';

@Controller('app-updates')
export class AppUpdatesController {
  constructor(private readonly appUpdatesService: AppUpdatesService) {}

  /**
   * Endpoint for clients to get the latest published updates (default 10)
   */
  @Public()
  @Get('latest')
  async getLatestUpdates(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    return await this.appUpdatesService.getLatestUpdates(isNaN(take) ? 10 : take);
  }

  /**
   * SuperAdmin: Get all updates (including drafts)
   */
  @Get('all')
  @UseGuards(SuperAdminGuard)
  async getAllUpdates() {
    return await this.appUpdatesService.getAllUpdates();
  }

  /**
   * SuperAdmin: Create a new update
   */
  @Post()
  @UseGuards(SuperAdminGuard)
  async createUpdate(@Body() body: CreateAppUpdateDto) {
    return await this.appUpdatesService.createUpdate(body);
  }

  /**
   * SuperAdmin: Edit an update
   */
  @Put(':id')
  @UseGuards(SuperAdminGuard)
  async updateUpdate(
    @Param('id') id: string,
    @Body() body: UpdateAppUpdateDto,
  ) {
    return await this.appUpdatesService.updateUpdate(id, body);
  }

  /**
   * SuperAdmin: Delete an update
   */
  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async deleteUpdate(@Param('id') id: string) {
    return await this.appUpdatesService.deleteUpdate(id);
  }
}
