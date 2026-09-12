import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '@nutrideli/shared-types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Create default admin if no users exist
    const count = await this.usersRepo.count();
    if (count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const admin = this.usersRepo.create({
        username: 'admin',
        passwordHash: hash,
        role: UserRole.ADMIN,
      });
      await this.usersRepo.save(admin);
      console.log('Default admin user created: admin / admin123');
    }
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const user = await this.usersRepo.findOne({ where: { username } });
    return user || undefined;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: any): Promise<User> {
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.usersRepo.create({
      username: data.username,
      passwordHash: hash,
      role: data.role || UserRole.POS,
    });
    return this.usersRepo.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }
}
