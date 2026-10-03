import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { PromoterCommission } from './promoter-commission.entity';

@Entity('promoters')
export class Promoter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', nullable: true })
  pagoMovilPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  pagoMovilCedula: string | null;

  @Column({ type: 'varchar', nullable: true })
  pagoMovilBank: string | null;

  @Column({ type: 'varchar', nullable: true })
  binancePayId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Tenant, (tenant) => tenant.promoter)
  tenants: Tenant[];

  @OneToMany(() => PromoterCommission, (commission) => commission.promoter)
  commissions: PromoterCommission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

