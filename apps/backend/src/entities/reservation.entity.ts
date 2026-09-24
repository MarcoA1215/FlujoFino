import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ReservationStatus, PaymentStatus } from '@nutrideli/shared-types';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Customer } from './customer.entity';

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  identification: string;

  @Column({ nullable: true })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

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

  @Column({ nullable: true })
  employeeId: string;

  @Column({ nullable: true })
  employeeName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  totalAmount: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  abonosTotal: number;

  @Column('jsonb', { nullable: true })
  abonosHistory: any[];

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  referralSource: string;

  @Column({ nullable: true })
  rescheduleStatus: string; // 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'REJECTED'

  @Column({ nullable: true })
  originalTime: string;

  @Column({ nullable: true })
  originalDate: string;

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
