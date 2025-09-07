import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import * as bcrypt from "bcrypt";
import { UserRole } from "../common/enums/user-role.enum";
import { plainToClass } from "class-transformer";
import { UserResponseDto } from "./dto/user-response.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    console.log("Received DTO:", createUserDto);
    console.log("DTO fields:", {
      dateOfBirth: createUserDto.dateOfBirth,
      profilePicture: createUserDto.profilePicture,
      isReplacementPlayer: createUserDto.isReplacementPlayer,
      isActive: createUserDto.isActive,
      role: createUserDto.role,
    });

    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const isActive = createUserDto.role === UserRole.OWNER ? false : true;

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      isActive,
    });

    console.log("User entity before save:", user);
    const savedUser = await this.usersRepository.save(user);
    console.log("Saved user:", savedUser);

    return plainToClass(UserResponseDto, savedUser);
  }

  async findAll(role?: UserRole): Promise<UserResponseDto[]> {
    const query = this.usersRepository.createQueryBuilder("user");
    if (role) {
      query.where("user.role = :role", { role });
    }
    const users = await query.getMany();
    return users.map((user) => plainToClass(UserResponseDto, user));
  }

  async getAvailablePlayers(search?: string, excludeUserId?: string): Promise<UserResponseDto[]> {
    const query = this.usersRepository
      .createQueryBuilder("user")
      .where("user.role = :role", { role: UserRole.PLAYER })
      .andWhere("user.isActive = :isActive", { isActive: true });

    if (excludeUserId) {
      query.andWhere("user.id != :excludeUserId", { excludeUserId });
    }

    if (search && search.trim()) {
      query.andWhere(
        "(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))",
        { search: `%${search.trim()}%` },
      );
    }

    query.orderBy("user.averageRating", "DESC").addOrderBy("user.firstName", "ASC");
    const users = await query.getMany();
    return users.map((user) => plainToClass(UserResponseDto, user));
  }

  async searchPlayers(searchQuery: string, excludeUserId?: string): Promise<UserResponseDto[]> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }
    return this.getAvailablePlayers(searchQuery, excludeUserId);
  }

  async searchPlayersByEmailOrPhone(searchType: 'email' | 'phoneNumber', query: string, excludeUserId?: string): Promise<UserResponseDto[]> {
    if (!query || !query.trim()) {
      throw new BadRequestException("Search query cannot be empty");
    }

    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .where("user.role = :role", { role: UserRole.PLAYER })
      .andWhere("user.isActive = :isActive", { isActive: true });

    if (excludeUserId) {
      queryBuilder.andWhere("user.id != :excludeUserId", { excludeUserId });
    }

    if (searchType === 'email') {
      queryBuilder.andWhere("user.email = :query", { query });
    } else if (searchType === 'phoneNumber') {
      queryBuilder.andWhere("user.phoneNumber = :query", { query });
    } else {
      throw new BadRequestException("Invalid search type. Use 'email' or 'phoneNumber'");
    }

    const users = await queryBuilder.getMany();
    return users.map((user) => plainToClass(UserResponseDto, user));
  }

  async findOne(id: string, options?: { relations?: string[] }): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: options?.relations || [],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return plainToClass(UserResponseDto, user);
  }

  async findOneRaw(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findByEmailRaw(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  async updateRaw(id: string, updateData: Partial<User>): Promise<void> {
    console.log(`[UsersService] Updating user ${id} with raw data:`, updateData);
    const result = await this.usersRepository.update(id, updateData);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    console.log(`[UsersService] User ${id} updated successfully`);
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser?: User): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role && currentUser?.role !== UserRole.ADMIN) {
      delete updateUserDto.role;
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);
    return plainToClass(UserResponseDto, updatedUser);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async toggleActive(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.isActive = !user.isActive;
    const updatedUser = await this.usersRepository.save(user);
    return plainToClass(UserResponseDto, updatedUser);
  }

  async updateAverageRating(
    playerId: string,
    averageRating: number,
    totalRatings: number,
    ratingSum: number,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: playerId } });

    if (!user) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    user.totalRatings = totalRatings;
    user.ratingSum = ratingSum;
    user.averageRating = averageRating;
    await this.usersRepository.save(user);
  }
}