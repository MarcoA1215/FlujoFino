import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

export enum SalaryAdvanceStatus {
  PENDIENTE = 'PENDIENTE',
  DESCONTADO = 'DESCONTADO',
}

@Entity('salary_advances')
@Index(['negocioId', 'status'])
@Index(['negocioId', 'userId'])
export class SalaryAdvance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ nullable: true })
  negocioId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'negocioId' })
  tenant: Tenant;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amountUSD: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amountBS: number;

  @Column('decimal', { precision: 12, scale: 4, default: 1, transformer: new ColumnNumericTransformer() })
  exchangeRate: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @Index()
  @Column({
    type: 'enum',
    enum: SalaryAdvanceStatus,
    default: SalaryAdvanceStatus.PENDIENTE,
  })
  status: SalaryAdvanceStatus;

  @CreateDateColumn()
  createdAt: Date;
}
