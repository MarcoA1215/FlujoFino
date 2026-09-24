import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

export enum FeedbackType {
  CLIENT_TO_BUSINESS = 'CLIENT_TO_BUSINESS',
  BUSINESS_TO_PLATFORM = 'BUSINESS_TO_PLATFORM',
}

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: FeedbackType })
  type: FeedbackType;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  clientName: string;

  @Column({ nullable: true })
  clientPhone: string;

  // Rating from 1 to 5
  @Column('int', { nullable: true })
  rating: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
