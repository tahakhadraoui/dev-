import { ConfigService } from "@nestjs/config"
import { config } from "dotenv"
import { DataSource } from "typeorm"
import { User } from "../users/entities/user.entity"
import { Team } from "../teams/entities/team.entity"
import { Reservation } from "../reservations/entities/reservation.entity"
import { Field } from "../fields/entities/field.entity"
import { Rating } from "../ratings/entities/rating.entity"
import { Notification } from "../notifications/entities/notification.entity"
import { FullMatch } from "src/matches/full-match/full-match.entity"
import { IncompleteMatch } from "src/matches/incomplete-match/incomplete-match.entity"
import { TeamVsTeamMatch } from "src/matches/team-vs-team-match/team-vs-team-match.entity"

config()

const configService = new ConfigService()

export default new DataSource({
  type: "postgres",
  host: configService.get("DB_HOST", "localhost"),
  port: configService.get("DB_PORT", 5432),
  username: configService.get("DB_USERNAME", "postgres"),
  password: configService.get("DB_PASSWORD", "postgres"),
  database: configService.get("DB_DATABASE", "sports_reservation"),
  entities: [User,FullMatch,IncompleteMatch,TeamVsTeamMatch, Team, Reservation, Field, Rating, Notification],
  migrations: ["src/migrations/*.ts"],
  synchronize: configService.get("DB_SYNCHRONIZE", true),
})
