import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findByEmail(email: string, includeSecrets = false) {
    const query = this.userModel.findOne({ email: email.toLowerCase() });

    if (includeSecrets) {
      query.select('+passwordHash +refreshTokenHash');
    }

    return query.exec();
  }

  async findById(id: string, includeRefreshToken = false) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const query = this.userModel.findById(id);

    if (includeRefreshToken) {
      query.select('+refreshTokenHash');
    }

    return query.exec();
  }

  async create(email: string, name: string, passwordHash: string) {
    try {
      return await this.userModel.create({
        email: email.toLowerCase(),
        name,
        passwordHash,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string) {
    await this.userModel
      .findByIdAndUpdate(userId, { refreshTokenHash }, { new: false })
      .exec();
  }

  async clearRefreshTokenHash(userId: string) {
    await this.userModel
      .findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } })
      .exec();
  }

  getId(user: UserDocument) {
    return user._id.toString();
  }

  private isDuplicateKeyError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
