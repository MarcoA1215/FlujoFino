import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { InvestmentType } from '@nutrideli/shared-types';

@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  negocioId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'negocioId' })
  tenant: Tenant;

  @Column({
    type: 'enum',
    enum: InvestmentType,
    default: InvestmentType.INVERSION_EXTERNA,
  })
  type: InvestmentType;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amountUSD: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amountBS: number;

  @Column('decimal', { precision: 12, scale: 4, default: 1, transformer: new ColumnNumericTransformer() })
  exchangeRate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @CreateDateColumn()
  createdAt: Date;
}
