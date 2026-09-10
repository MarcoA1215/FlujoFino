import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { RawMaterial } from './raw-material.entity';
import { MovementType } from '@nutrideli/shared-types';

@Entity()
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rawMaterialId: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => RawMaterial, material => material.movements)
  rawMaterial: RawMaterial;
}

