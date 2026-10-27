import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Promoter } from './promoter.entity';
import { PlatformExpenseType } from '@finowork/shared-types';

@Entity('platform_expenses')
@Index(['type', 'expense_date'])
@Index(['category'])
export class PlatformExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: PlatformExpenseType.OPERATING,
  })
  type: PlatformExpenseType;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  @Column('decimal', {
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  amount_bs: number | null;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  exchange_rate: number | null;

  @Column({ type: 'varchar', length: 50, default: 'TRANSFERENCIA' })
  payment_method: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  expense_date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_period: string | null;

  @Column({ type: 'uuid', nullable: true })
  promoter_id: string | null;

  @ManyToOne(() => Promoter, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'promoter_id' })
  promoter: Promoter | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
