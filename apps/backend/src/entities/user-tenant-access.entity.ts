import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { UserRole } from '@finowork/shared-types';
import { WorkSchedule } from './work-schedule.entity';

@Entity()
@Index(['userId', 'tenantId'])
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

  @Column({ type: 'simple-array', nullable: true, default: '' })
  roles: UserRole[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', default: 'ACCEPTED' }) // 'PENDING', 'ACCEPTED', 'REJECTED'
  status: string;

  @Column({ type: 'decimal', nullable: true , precision: 12, scale: 2, transformer: new ColumnNumericTransformer() })
  salaryAmount: number | null;

  @Column({ type: 'varchar', nullable: true }) // 'SEMANAL', 'QUINCENAL', 'MENSUAL'
  salaryPeriod: string | null;

  @Column({ name: 'compensation_type', type: 'varchar', default: 'FIJO' }) // 'FIJO', 'COMISION', 'MIXTO'
  compensationType: string;

  @Column({ name: 'commission_percentage', type: 'decimal', nullable: true, precision: 5, scale: 2, transformer: new ColumnNumericTransformer() })
  commissionPercentage: number | null;

  @Column({ name: 'job_title', type: 'varchar', nullable: true })
  jobTitle: string | null;

  @Column({ name: 'entry_time', type: 'varchar', nullable: true })
  entryTime: string | null;

  @Column({ name: 'exit_time', type: 'varchar', nullable: true })
  exitTime: string | null;

  @Column({ name: 'lunch_start', type: 'varchar', nullable: true })
  lunchStart: string | null;

  @Column({ name: 'lunch_end', type: 'varchar', nullable: true })
  lunchEnd: string | null;

  @Column({ name: 'last_payroll_date', type: 'varchar', nullable: true })
  lastPayrollDate: string | null;

  @Column({ name: 'last_payroll_period_start', type: 'varchar', nullable: true })
  lastPayrollPeriodStart: string | null;

  @Column({ name: 'last_payroll_period_end', type: 'varchar', nullable: true })
  lastPayrollPeriodEnd: string | null;

  @Column({ name: 'last_payroll_amount', type: 'decimal', nullable: true, precision: 12, scale: 2, transformer: new ColumnNumericTransformer() })
  lastPayrollAmount: number | null;

  @OneToMany(() => WorkSchedule, ws => ws.userTenantAccess)
  workSchedules: WorkSchedule[];
}
