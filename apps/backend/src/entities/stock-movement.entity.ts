import { Tenant } from './tenant.entity';
import { Entity, Index, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { RawMaterial } from './raw-material.entity';
import { MovementType } from '@nutrideli/shared-types';

@Entity()
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rawMaterialId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  @Column('float')
  quantity: number;

  @Column('float')
  totalCost: number;

  @Column({ nullable: true })
  description: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => RawMaterial, material => material.movements)
  rawMaterial: RawMaterial;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;

}