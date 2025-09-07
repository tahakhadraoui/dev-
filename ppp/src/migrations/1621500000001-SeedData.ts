import type { MigrationInterface, QueryRunner } from "typeorm"
import * as bcrypt from "bcrypt"

export class SeedData1621500000001 implements MigrationInterface {
  name = "SeedData1621500000001"

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10)
    await queryRunner.query(`
      INSERT INTO "users" (
        "email", "password", "firstName", "lastName", "role"
      ) VALUES (
        'admin@example.com', '${adminPassword}', 'Admin', 'User', 'admin'
      );
    `)

    // Create owner users
    const ownerPassword = await bcrypt.hash("owner123", 10)
    await queryRunner.query(`
      INSERT INTO "users" (
        "email", "password", "firstName", "lastName", "role", "city", "phoneNumber"
      ) VALUES 
      (
        'owner1@example.com', '${ownerPassword}', 'John', 'Doe', 'owner', 'Paris', '+33123456789'
      ),
      (
        'owner2@example.com', '${ownerPassword}', 'Jane', 'Smith', 'owner', 'Lyon', '+33987654321'
      );
    `)

    // Create player users
    const playerPassword = await bcrypt.hash("player123", 10)
    await queryRunner.query(`
      INSERT INTO "users" (
        "email", "password", "firstName", "lastName", "role", "city", "averageRating", "totalRatings"
      ) VALUES 
      (
        'player1@example.com', '${playerPassword}', 'Michael', 'Johnson', 'player', 'Paris', 8.5, 10
      ),
      (
        'player2@example.com', '${playerPassword}', 'Sarah', 'Williams', 'player', 'Paris', 7.8, 8
      ),
      (
        'player3@example.com', '${playerPassword}', 'David', 'Brown', 'player', 'Lyon', 9.2, 12
      ),
      (
        'player4@example.com', '${playerPassword}', 'Emma', 'Jones', 'player', 'Lyon', 8.0, 6
      );
    `)

    // Create fields
    await queryRunner.query(`
      INSERT INTO "fields" (
        "name", "description", "address", "city", "pricePerHour", "defaultDuration", 
        "hasShowers", "hasWater", "hasLighting", "isIndoor", "openingTime", "closingTime", "ownerId"
      ) 
      SELECT 
        'Field Paris 1', 'Beautiful indoor field in Paris', '123 Paris St', 'Paris', 80.00, 60, 
        true, true, true, true, '08:00', '22:00', id
      FROM "users" WHERE "email" = 'owner1@example.com';
      
      INSERT INTO "fields" (
        "name", "description", "address", "city", "pricePerHour", "defaultDuration", 
        "hasShowers", "hasWater", "hasLighting", "isIndoor", "openingTime", "closingTime", "ownerId"
      ) 
      SELECT 
        'Field Paris 2', 'Outdoor field with lighting', '456 Paris Ave', 'Paris', 60.00, 90, 
        false, true, true, false, '09:00', '21:00', id
      FROM "users" WHERE "email" = 'owner1@example.com';
      
      INSERT INTO "fields" (
        "name", "description", "address", "city", "pricePerHour", "defaultDuration", 
        "hasShowers", "hasWater", "hasLighting", "isIndoor", "openingTime", "closingTime", "ownerId"
      ) 
      SELECT 
        'Field Lyon 1', 'Premium indoor field in Lyon', '123 Lyon St', 'Lyon', 90.00, 60, 
        true, true, true, true, '08:00', '23:00', id
      FROM "users" WHERE "email" = 'owner2@example.com';
    `)

    // Create teams
    await queryRunner.query(`
      INSERT INTO "teams" (
        "name", "description", "captainId"
      ) 
      SELECT 
        'Paris Stars', 'A team of skilled players from Paris', id
      FROM "users" WHERE "email" = 'player1@example.com';
      
      INSERT INTO "teams" (
        "name", "description", "captainId"
      ) 
      SELECT 
        'Lyon Tigers', 'The best team in Lyon', id
      FROM "users" WHERE "email" = 'player3@example.com';
    `)

    // Add players to teams
    await queryRunner.query(`
      INSERT INTO "team_players" ("teamId", "userId")
      SELECT t.id, u.id
      FROM "teams" t, "users" u
      WHERE t.name = 'Paris Stars' AND u.email = 'player1@example.com';
      
      INSERT INTO "team_players" ("teamId", "userId")
      SELECT t.id, u.id
      FROM "teams" t, "users" u
      WHERE t.name = 'Paris Stars' AND u.email = 'player2@example.com';
      
      INSERT INTO "team_players" ("teamId", "userId")
      SELECT t.id, u.id
      FROM "teams" t, "users" u
      WHERE t.name = 'Lyon Tigers' AND u.email = 'player3@example.com';
      
      INSERT INTO "team_players" ("teamId", "userId")
      SELECT t.id, u.id
      FROM "teams" t, "users" u
      WHERE t.name = 'Lyon Tigers' AND u.email = 'player4@example.com';
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete all data
    await queryRunner.query(`DELETE FROM "team_players"`)
    await queryRunner.query(`DELETE FROM "teams"`)
    await queryRunner.query(`DELETE FROM "fields"`)
    await queryRunner.query(`DELETE FROM "users"`)
  }
}
