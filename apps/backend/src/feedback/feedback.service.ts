import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackType } from '../entities/feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepo: Repository<Feedback>
  ) {}

  async createClientFeedback(tenantId: string, dto: { content: string, clientName?: string, clientPhone?: string, rating?: number }) {
    const feedback = this.feedbackRepo.create({
      tenantId,
      type: FeedbackType.CLIENT_TO_BUSINESS,
      content: dto.content,
      clientName: dto.clientName,
      clientPhone: dto.clientPhone,
      rating: dto.rating
    });
    return this.feedbackRepo.save(feedback);
  }

  async createPlatformFeedback(tenantId: string, content: string) {
    const feedback = this.feedbackRepo.create({
      tenantId,
      type: FeedbackType.BUSINESS_TO_PLATFORM,
      content
    });
    return this.feedbackRepo.save(feedback);
  }

  async getBusinessFeedbacks(tenantId: string) {
    return this.feedbackRepo.find({
      where: { tenantId, type: FeedbackType.CLIENT_TO_BUSINESS },
      order: { createdAt: 'DESC' }
    });
  }

  async getPlatformFeedbacks() {
    return this.feedbackRepo.find({
      where: { type: FeedbackType.BUSINESS_TO_PLATFORM },
      relations: { tenant: true },
      order: { createdAt: 'DESC' }
    });
  }
}
