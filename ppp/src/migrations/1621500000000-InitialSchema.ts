import type { MigrationInterface, QueryRunner } from "typeorm"

export class InitialSchema1621500000000 implements MigrationInterface {
  name = "InitialSchema1621500000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('player', 'owner', 'admin');
      
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "phoneNumber" character varying,
        "role" "user_role_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "city" character varying,
        "profilePicture" character varying,
        "bio" text,
        "averageRating" double precision NOT NULL DEFAULT 0,
        "totalRatings" integer NOT NULL DEFAULT 0,
        "isReplacementPlayer" boolean NOT NULL DEFAULT false,
        "refreshToken" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
    `)

    // Create matches table
    await queryRunner.query(`
      CREATE TYPE "match_type_enum" AS ENUM ('solo', 'incomplete', 'full', 'team_vs_team');
      CREATE TYPE "match_status_enum" AS ENUM ('pending', 'full', 'confirmed', 'completed', 'cancelled');
      
      CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "type" "match_type_enum" NOT NULL,
        "status" "match_status_enum" NOT NULL DEFAULT 'pending',
        "minAge" integer,
        "maxAge" integer,
        "minSkillLevel" double precision,
        "maxSkillLevel" double precision,
        "teamSize" integer NOT NULL,
        "location" character varying NOT NULL,
        "city" character varying NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "time" TIME NOT NULL,
        "currentPlayers" integer NOT NULL DEFAULT 0,
        "isCompleted" boolean NOT NULL DEFAULT false,
        "creatorId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_matches" PRIMARY KEY ("id")
      );
    `)

    // Create teams table
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "logo" character varying,
        "description" text,
        "averageRating" double precision NOT NULL DEFAULT 0,
        "captainId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      );
    `)

    // Create fields table
    await queryRunner.query(`
      CREATE TABLE "fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "address" character varying NOT NULL,
        "city" character varying NOT NULL,
        "pricePerHour" decimal(10,2) NOT NULL,
        "defaultDuration" integer NOT NULL DEFAULT 60,
        "hasShowers" boolean NOT NULL DEFAULT false,
        "hasWater" boolean NOT NULL DEFAULT false,
        "hasLighting" boolean NOT NULL DEFAULT false,
        "isIndoor" boolean NOT NULL DEFAULT false,
        "images" json,
        "openingTime" TIME NOT NULL,
        "closingTime" TIME NOT NULL,
        "ownerId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fields" PRIMARY KEY ("id")
      );
    `)

    // Create reservations table
    await queryRunner.query(`
      CREATE TYPE "reservation_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
      
      CREATE TABLE "reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "status" "reservation_status_enum" NOT NULL DEFAULT 'pending',
        "totalPrice" decimal(10,2) NOT NULL,
        "notes" text,
        "matchId" uuid,
        "fieldId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reservations" PRIMARY KEY ("id")
      );
    `)

    // Create ratings table
    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" integer NOT NULL,
        "feedback" text,
        "raterId" uuid,
        "playerId" uuid,
        "matchId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ratings" PRIMARY KEY ("id")
      );
    `)

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "type" character varying NOT NULL,
        "relatedId" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "userId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      );
    `)

    // Create join tables
    await queryRunner.query(`
      CREATE TABLE "match_players" (
        "matchId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_match_players" PRIMARY KEY ("matchId", "userId")
      );
      
      CREATE TABLE "match_teams" (
        "matchId" uuid NOT NULL,
        "teamId" uuid NOT NULL,
        CONSTRAINT "PK_match_teams" PRIMARY KEY ("matchId", "teamId")
      );
      
      CREATE TABLE "team_players" (
        "teamId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_team_players" PRIMARY KEY ("teamId", "userId")
      );
    `)

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE;
      ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_captain" FOREIGN KEY ("captainId") REFERENCES "users"("id") ON DELETE SET NULL;
      ALTER TABLE "fields" ADD CONSTRAINT "FK_fields_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE;
      ALTER TABLE "reservations" ADD CONSTRAINT "FK_reservations_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE;
      ALTER TABLE "reservations" ADD CONSTRAINT "FK_reservations_field" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE;
      ALTER TABLE "ratings" ADD CONSTRAINT "FK_ratings_rater" FOREIGN KEY ("raterId") REFERENCES "users"("id") ON DELETE CASCADE;
      ALTER TABLE "ratings" ADD CONSTRAINT "FK_ratings_player" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE;
      ALTER TABLE "ratings" ADD CONSTRAINT "FK_ratings_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE;
      ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
      
      ALTER TABLE "match_players" ADD CONSTRAINT "FK_match_players_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE;
      ALTER TABLE "match_players" ADD CONSTRAINT "FK_match_players_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
      
      ALTER TABLE "match_teams" ADD CONSTRAINT "FK_match_teams_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE;
      ALTER TABLE "match_teams" ADD CONSTRAINT "FK_match_teams_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE;
      
      ALTER TABLE "team_players" ADD CONSTRAINT "FK_team_players_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE;
      ALTER TABLE "team_players" ADD CONSTRAINT "FK_team_players_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "match_players" DROP CONSTRAINT "FK_match_players_match";
      ALTER TABLE "match_players" DROP CONSTRAINT "FK_match_players_user";
      
      ALTER TABLE "match_teams" DROP CONSTRAINT "FK_match_teams_match";
      ALTER TABLE "match_teams" DROP CONSTRAINT "FK_match_teams_team";
      
      ALTER TABLE "team_players" DROP CONSTRAINT "FK_team_players_team";
      ALTER TABLE "team_players" DROP CONSTRAINT "FK_team_players_user";
      
      ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_creator";
      ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_captain";
      ALTER TABLE "fields" DROP CONSTRAINT "FK_fields_owner";
      ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservations_match";
      ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservations_field";
      ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_rater";
      ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_player";
      ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_match";
      ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user";
    `)

    // Drop tables
    await queryRunner.query(`
      DROP TABLE "match_players";
      DROP TABLE "match_teams";
      DROP TABLE "team_players";
      DROP TABLE "notifications";
      DROP TABLE "ratings";
      DROP TABLE "reservations";
      DROP TABLE "fields";
      DROP TABLE "teams";
      DROP TABLE "matches";
      DROP TABLE "users";
    `)

    // Drop enums
    await queryRunner.query(`
      DROP TYPE "user_role_enum";
      DROP TYPE "match_type_enum";
      DROP TYPE "match_status_enum";
      DROP TYPE "reservation_status_enum";
    `)
  }
}
