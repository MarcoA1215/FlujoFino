import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('cash_exchanges')
@Index(['tenantId', 'createdAt'])
export class CashExchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amountBs: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amountUSD: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0, transformer: new ColumnNumericTransformer() })
  exchangeRate: number;

  @Column({ default: 'BUY_USD' })
  operationType: string; // 'BUY_USD' | 'SELL_USD'

  @Column({ default: 'BANCO_BS' })
  source: string; // 'BANCO_BS' | 'PAGO_MOVIL' | 'PUNTO'

  @Column({ default: 'CASH_USD' })
  destination: string; // 'CASH_USD' | 'BINANCE_USDT'

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
