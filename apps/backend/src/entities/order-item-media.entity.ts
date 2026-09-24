import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { OrderItem } from './order-item.entity';

@Entity()
export class OrderItemMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  imageUrl: string;

  @ManyToOne(() => OrderItem, orderItem => orderItem.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @Column()
  orderItemId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
