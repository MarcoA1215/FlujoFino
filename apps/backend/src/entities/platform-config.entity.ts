import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';

@Entity('platform_config')
export class PlatformConfig {
  @PrimaryColumn({ default: 'default' })
  id: string;

  @Column({ nullable: true })
  companyBank: string;

  @Column({ nullable: true })
  companyCedula: string;

  @Column({ nullable: true })
  companyPhone: string;

  @Column({ nullable: true })
  companyAccountNumber: string;

  @Column({ nullable: true })
  companyAccountHolder: string;

  @Column({ nullable: true })
  binancePayId: string;

  @Column({ nullable: true })
  binanceEmail: string;

  @Column('decimal', { precision: 10, scale: 2, default: 20.00, transformer: new ColumnNumericTransformer() })
  defaultMonthlyPrice: number;

  @Column({ type: 'int', default: 15 })
  defaultTrialDays: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
