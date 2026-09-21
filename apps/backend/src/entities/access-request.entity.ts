import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '@nutrideli/shared-types';

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity()
export class AccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  userId: string;

  @Column()
  userName: string;

  @Column({ nullable: true })
  userEmail: string;

  @Column({ name: 'job_title', nullable: true })
  jobTitle: string;

  @Column({ type: 'varchar', default: 'POS' })
  role: UserRole;

  @Column({ type: 'varchar', default: AccessRequestStatus.PENDING })
  status: AccessRequestStatus;

  @Column({ type: 'varchar', default: 'OUT_OF_SCHEDULE' })
  reason: 'OUT_OF_SCHEDULE' | 'POLICY_ALWAYS_REQUIRE';

  @Column({ name: 'entry_time', nullable: true })
  entryTime: string;

  @Column({ name: 'exit_time', nullable: true })
  exitTime: string;

  @Column({ name: 'attempt_time' })
  attemptTime: string;

  @Column({ name: 'approved_token', type: 'text', nullable: true })
  approvedToken: string | null;

  @Column({ name: 'approved_payload', type: 'text', nullable: true })
  approvedPayload: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
