import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Public } from '../auth/public.decorator';
import { decodeTenantId } from '../utils/tenant-crypto';

@Public()
@Controller('public/feedback')
export class PublicFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post(':tenantToken')
  async submitFeedback(@Param('tenantToken') token: string, @Body() dto: any) {
    let tenantId: string;
    try {
      tenantId = decodeTenantId(token);
    } catch {
      throw new NotFoundException('Token inválido');
    }
    return this.feedbackService.createClientFeedback(tenantId, dto);
  }
}
