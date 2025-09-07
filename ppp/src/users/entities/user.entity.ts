import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { Team } from '../../teams/entities/team.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { Field } from '../../fields/entities/field.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Exclude } from 'class-transformer';
import { FullMatch } from 'src/matches/full-match/full-match.entity';
import { IncompleteMatch } from 'src/matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from 'src/matches/team-vs-team-match/team-vs-team-match.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Order } from 'src/order/entities/order.entity';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PLAYER,
  })
  role: UserRole;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ default: 5 })
  totalRatings: number;

  @Column({ default: 5 })
  ratingSum: number;

  @Column({ type: 'float', default: 5 })
  averageRating: number;

  @Column({ default: false })
  isReplacementPlayer: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => FullMatch, (match) => match.creator)
  createdFullMatches: FullMatch[];

  @OneToMany(() => IncompleteMatch, (match) => match.creator)
  createdIncompleteMatches: IncompleteMatch[];

  @OneToMany(() => TeamVsTeamMatch, (match) => match.creator)
  createdTeamVsTeamMatches: TeamVsTeamMatch[];

  @ManyToMany(() => IncompleteMatch, (match) => match.players)
  joinedMatches: IncompleteMatch[];

  @ManyToMany(() => Team, (team) => team.players)
  teams: Team[];

  @OneToMany(() => Team, (team) => team.captain)
  captainedTeams: Team[];

  @OneToMany(() => Rating, (rating) => rating.rater)
  givenRatings: Rating[];

  @OneToMany(() => Rating, (rating) => rating.player)
  receivedRatings: Rating[];

  @OneToMany(() => Field, (field) => field.owner)
  fields: Field[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];
  @OneToMany(() => Order, order => order.user)
  orders: Order[];


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  @Column({ nullable: true })
  resetToken: string;

  @Column({ nullable: true })
  resetTokenExpires: Date;

  calculateAverageRating() {
    if (this.totalRatings > 0) {
      this.averageRating = this.ratingSum / this.totalRatings;
    }
  }
}

export { UserRole };
