import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { UsersModule } from "./users/users.module"
import { AuthModule } from "./auth/auth.module"
import { TeamsModule } from "./teams/teams.module"
import { FieldsModule } from "./fields/fields.module"
import { RatingsModule } from "./ratings/ratings.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { User } from "./users/entities/user.entity"
import { Team } from "./teams/entities/team.entity"
import { Reservation } from "./reservations/entities/reservation.entity"
import { Field } from "./fields/entities/field.entity"
import { Rating } from "./ratings/entities/rating.entity"
import { Notification } from "./notifications/entities/notification.entity"
import { PlayerModule } from "./player/player.module"
import { TeamVsTeamMatch } from "./matches/team-vs-team-match/team-vs-team-match.entity"
import { IncompleteMatch } from "./matches/incomplete-match/incomplete-match.entity"
import { FullMatch } from "./matches/full-match/full-match.entity"
import { Terrain } from "./terrain/terrain.entity"
import { TeamVsTeamMatchModule } from "./matches/team-vs-team-match/team-vs-team-match.module"
import { AdminModule } from "./admin/admin.module"
import { OwnerModule } from "./owner/owner.module"
import { ReservationsModule } from "./reservations/reservations.module"
import { IncompleteMatchModule } from "./matches/incomplete-match/incomplete-match.module"
import { FullMatchModule } from "./matches/full-match/full-match.module"
import { TerrainModule } from "./terrain/terrain.module"
import { Chat } from "./chat/entities/chat.entity"
import { ChatModule } from "./chat/chat.module"
import { ChatMessage } from "./chat/entities/chat-message.entity"
import { MailModule } from "./mail/mail.module"
import { WeatherModule } from "./weather/weather.module"
import { PlayerHealthModule } from './player-health/player-health.module';
import { PlayerHealth } from "./player-health/player-health.entity"
import { Order } from "./order/entities/order.entity"
import { OrdersModule } from "./order/orders.module"
import { OrderItemsModule } from "./order-item/order-items.module"
import { ProductsModule } from "./product/products.module"
import { CategoriesModule } from "./category/categories.module"
import { OrderItem } from "./order-item/entities/order-item.entity"
import { Product } from "./product/entities/product.entity"
import { Category } from "./category/entities/category.entity"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DB_HOST", "localhost"),
        port: configService.get("DB_PORT", 5432),
        username: configService.get("DB_USERNAME", "postgres"),
        password: configService.get("DB_PASSWORD", "postgres"),
        database: configService.get("DB_DATABASE", "sports_reservation"),
        entities: [User,TeamVsTeamMatch,IncompleteMatch,FullMatch, Team, Reservation, Field, Rating, Notification,Terrain,Chat,ChatMessage,PlayerHealth,Order,OrderItem,Product,Category],
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") !== "production",
        migrations: ["dist/migrations/*.js"],
        migrationsRun: configService.get("RUN_MIGRATIONS") === "true",
      }),
    }),
    UsersModule,
    AuthModule,
    TeamVsTeamMatchModule,
    AdminModule,
    OwnerModule,
    ReservationsModule,
    TerrainModule,
    TeamsModule,
    FieldsModule,
    RatingsModule,
    NotificationsModule,
    IncompleteMatchModule,
    FullMatchModule,
    PlayerModule,
    ChatModule,
    MailModule,
    WeatherModule,
    PlayerHealthModule,
    OrdersModule,
    OrderItemsModule,
    ProductsModule,
    CategoriesModule
  ],
})
export class AppModule {}
