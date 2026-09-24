import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
﻿import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';

@Entity()
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  feePrice: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;

}