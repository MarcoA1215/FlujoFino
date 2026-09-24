import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ReservationStatus, PaymentStatus } from '@nutrideli/shared-types';
import { Tenant } from './tenant.entity';

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time: string;

  @Column({ type: 'int', nullable: true })
  numberOfPeople: number;

  @Column({ nullable: true })
  serviceId: string;

  @Column({ nullable: true })
  serviceName: string;

  @Column({ nullable: true })
  tableNumber: string;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column('float', { default: 0 })
  totalAmount: number;

  @Column('float', { default: 0 })
  abonosTotal: number;

  @Column('jsonb', { nullable: true })
  abonosHistory: any[];

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  referralSource: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

