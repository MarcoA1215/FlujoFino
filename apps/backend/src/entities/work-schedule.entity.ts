import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserTenantAccess } from './user-tenant-access.entity';

@Entity()
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserTenantAccess, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userTenantAccessId' })
  userTenantAccess: UserTenantAccess;

  @Column()
  userTenantAccessId: string;

  // 0 = Sunday, 1 = Monday, etc.
  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;
}
