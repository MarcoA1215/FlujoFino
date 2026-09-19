import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { UserRole } from '@nutrideli/shared-types';
import { WorkSchedule } from './work-schedule.entity';

@Entity()
export class UserTenantAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.tenantAccess, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', default: 'USER' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', default: 'ACCEPTED' }) // 'PENDING', 'ACCEPTED', 'REJECTED'
  status: string;

  @Column({ type: 'float', nullable: true })
  salaryAmount: number;

  @Column({ type: 'varchar', nullable: true }) // 'SEMANAL', 'QUINCENAL', 'MENSUAL'
  salaryPeriod: string;

  @OneToMany(() => WorkSchedule, ws => ws.userTenantAccess)
  workSchedules: WorkSchedule[];
}
