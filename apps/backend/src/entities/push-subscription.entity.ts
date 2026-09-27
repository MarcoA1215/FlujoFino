import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('push_subscriptions')
@Index(['negocioId', 'role'])
@Index(['negocioId', 'identifier'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  identifier: string; // Cédula o teléfono normalizado

  @Column('text')
  endpoint: string;

  @Column('text')
  p256dh: string;

  @Column('text')
  auth: string;

  @Index()
  @Column({ nullable: true })
  negocioId: string;

  @Column({ default: 'CUSTOMER' })
  role: string; // 'CUSTOMER' | 'ADMIN' | 'CAJERO'

  @CreateDateColumn()
  createdAt: Date;
}
