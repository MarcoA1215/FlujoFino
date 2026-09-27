import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  identifier: string; // Cédula o teléfono normalizado

  @Column('text')
  endpoint: string;

  @Column('text')
  p256dh: string;

  @Column('text')
  auth: string;

  @Column({ nullable: true })
  negocioId: string;

  @CreateDateColumn()
  createdAt: Date;
}
