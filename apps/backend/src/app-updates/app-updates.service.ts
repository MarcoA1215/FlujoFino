import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUpdate } from '../entities/app-update.entity';
import { CreateAppUpdateDto } from './dto/create-app-update.dto';
import { UpdateAppUpdateDto } from './dto/update-app-update.dto';

@Injectable()
export class AppUpdatesService {
  constructor(
    @InjectRepository(AppUpdate)
    private readonly appUpdateRepo: Repository<AppUpdate>,
  ) {}

  /**
   * Return the latest published updates for client view (default 10)
   */
  async getLatestUpdates(limit: number = 10): Promise<AppUpdate[]> {
    return await this.appUpdateRepo.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Return all updates for SuperAdmin dashboard
   */
  async getAllUpdates(): Promise<AppUpdate[]> {
    return await this.appUpdateRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getUpdateById(id: string): Promise<AppUpdate> {
    const update = await this.appUpdateRepo.findOne({ where: { id } });
    if (!update) {
      throw new NotFoundException(`Actualización con ID "${id}" no encontrada`);
    }
    return update;
  }

  async createUpdate(dto: CreateAppUpdateDto): Promise<AppUpdate> {
    const isPublished = dto.isPublished !== undefined ? dto.isPublished : true;
    const update = this.appUpdateRepo.create({
      title: dto.title.trim(),
      version: dto.version?.trim() || null,
      summary: dto.summary?.trim() || null,
      changes: Array.isArray(dto.changes) ? dto.changes : [],
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    });

    return await this.appUpdateRepo.save(update);
  }

  async updateUpdate(id: string, dto: UpdateAppUpdateDto): Promise<AppUpdate> {
    const update = await this.getUpdateById(id);

    if (dto.title !== undefined) update.title = dto.title.trim();
    if (dto.version !== undefined) update.version = dto.version?.trim() || null;
    if (dto.summary !== undefined) update.summary = dto.summary?.trim() || null;
    if (dto.changes !== undefined) update.changes = Array.isArray(dto.changes) ? dto.changes : [];

    if (dto.isPublished !== undefined) {
      if (dto.isPublished && !update.isPublished && !update.publishedAt) {
        update.publishedAt = new Date();
      }
      update.isPublished = dto.isPublished;
    }

    return await this.appUpdateRepo.save(update);
  }

  async deleteUpdate(id: string): Promise<{ success: boolean }> {
    const update = await this.getUpdateById(id);
    await this.appUpdateRepo.remove(update);
    return { success: true };
  }
}
