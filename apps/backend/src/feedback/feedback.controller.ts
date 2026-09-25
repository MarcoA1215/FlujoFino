import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@nutrideli/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('business')
  getBusinessFeedbacks(@Request() req: any) {
    return this.feedbackService.getBusinessFeedbacks(req.user.tenantId);
  }

  @Post('platform')
  submitPlatformFeedback(@Request() req: any, @Body('content') content: string) {
    return this.feedbackService.createPlatformFeedback(req.user.tenantId, content);
  }

  // Global/SuperAdmin view of platform feedbacks
  @Get('platform')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  getPlatformFeedbacks() {
    return this.feedbackService.getPlatformFeedbacks();
  }
}

