import { UserTenantAccess } from './user-tenant-access.entity';
import { Entity, PrimaryGeneratedColumn, OneToMany, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '@finowork/shared-types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: UserRole.POS })
  role: UserRole;

  @Column({ nullable: true })
  identification: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verification_code', type: 'varchar', length: 6, nullable: true })
  emailVerificationCode: string | null;

  @Column({ name: 'email_verification_expires_at', type: 'timestamp', nullable: true })
  emailVerificationExpiresAt: Date | null;

  @Column({ nullable: true })
  resetPasswordCode: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserTenantAccess, access => access.user)
  tenantAccess: UserTenantAccess[];

}