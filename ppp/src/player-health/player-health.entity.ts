import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity()
export class PlayerHealth {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  player: User;

  @Column()
  age: number;

  @Column()
  weight: number;

  @Column()
  height: number;

  @Column()
  recentInjuries: string;

  @Column()
  recoveryStatus: string;

  @Column()
  fitnessLevel: number;

  @Column()
  trainingHours: number;

  @Column()
  sleepHours: number;

  @Column()
  matchIntensity: number;

  @Column()
  stressLevel: number;

  @Column({ default: false })
  injuryOccurred: boolean;

  @Column({ type: 'varchar', nullable: true })
  injuryType: string | null;

  @Column({ type: 'date', nullable: true })
  injuryDate: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}