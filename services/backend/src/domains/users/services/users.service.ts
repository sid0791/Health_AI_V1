import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { UserGoals } from '../entities/user-goals.entity';
import { UserConsent } from '../entities/user-consent.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

export interface FindAllUsersOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface FindAllUsersResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
    @InjectRepository(UserGoals)
    private readonly userGoalsRepository: Repository<UserGoals>,
    @InjectRepository(UserConsent)
    private readonly userConsentRepository: Repository<UserConsent>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, phoneNumber, password, firstName, lastName, displayName, ...userData } =
      createUserDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, ...(phoneNumber ? [{ phoneNumber }] : [])],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('User with this email already exists');
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password) {
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Create user
    const user = this.usersRepository.create({
      ...userData,
      email,
      phoneNumber,
      passwordHash,
    });

    const savedUser = await this.usersRepository.save(user);

    // Create profile if name information is provided
    if (firstName || lastName || displayName) {
      const profile = this.userProfileRepository.create({
        userId: savedUser.id,
        firstName: firstName || '',
        lastName: lastName || '',
        displayName,
        country: userData.dataResidencyRegion || 'IN',
      });
      await this.userProfileRepository.save(profile);
    }

    this.logger.log(`User created with ID: ${savedUser.id}`);
    return savedUser;
  }

  async findAll(options: FindAllUsersOptions): Promise<FindAllUsersResult> {
    const { page, limit: rawLimit, search } = options;
    const limit = Math.min(rawLimit, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    let where: FindOptionsWhere<User> | FindOptionsWhere<User>[] = {
      status: UserStatus.ACTIVE,
    };

    if (search) {
      where = [
        { email: ILike(`%${search}%`), status: UserStatus.ACTIVE },
        { phoneNumber: ILike(`%${search}%`), status: UserStatus.ACTIVE },
      ];
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where,
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
      relations: ['profile'],
    });

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, status: UserStatus.ACTIVE },
      relations: ['profile', 'preferences', 'goals'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email, status: UserStatus.ACTIVE },
      relations: ['profile'],
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phoneNumber, status: UserStatus.ACTIVE },
      relations: ['profile'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email is already in use');
      }
    }

    if (updateUserDto.phoneNumber && updateUserDto.phoneNumber !== user.phoneNumber) {
      const existingUser = await this.usersRepository.findOne({
        where: { phoneNumber: updateUserDto.phoneNumber },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    // Hash new password if provided
    if (updateUserDto.password) {
      const saltRounds = 12;
      updateUserDto['passwordHash'] = await bcrypt.hash(updateUserDto.password, saltRounds);
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);

    this.logger.log(`User updated with ID: ${id}`);
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    user.softDelete();
    await this.usersRepository.save(user);

    this.logger.log(`User soft deleted with ID: ${id}`);
  }

  async getProfile(id: string): Promise<UserProfile> {
    const user = await this.findOne(id);
    return user.profile;
  }

  async getPreferences(id: string): Promise<UserPreferences> {
    const user = await this.findOne(id);
    return user.preferences;
  }

  async getGoals(id: string): Promise<UserGoals> {
    const user = await this.findOne(id);
    return user.goals;
  }

  async getConsents(id: string): Promise<UserConsent[]> {
    const user = await this.findOne(id);
    return user.consents;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, user.passwordHash);
  }

  async lockUser(id: string, durationMinutes: number = 30): Promise<void> {
    const user = await this.findOne(id);
    user.lock(durationMinutes);
    await this.usersRepository.save(user);

    this.logger.warn(`User locked for ${durationMinutes} minutes: ${id}`);
  }

  async unlockUser(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.unlock();
    await this.usersRepository.save(user);

    this.logger.log(`User unlocked: ${id}`);
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.failedLoginAttempts++;

    // Lock user after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      user.lock(30); // Lock for 30 minutes
      this.logger.warn(`User locked due to failed login attempts: ${id}`);
    }

    await this.usersRepository.save(user);
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    user.loginCount++;
    await this.usersRepository.save(user);
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    recentSignups: number;
  }> {
    const [total, active, inactive] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.usersRepository.count({ where: { status: UserStatus.INACTIVE } }),
    ]);

    // Users who signed up in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSignups = await this.usersRepository.count({
      where: {
        createdAt: { $gte: thirtyDaysAgo } as any,
        status: UserStatus.ACTIVE,
      },
    });

    return {
      total,
      active,
      inactive,
      recentSignups,
    };
  }
}
