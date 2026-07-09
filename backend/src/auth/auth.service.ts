import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './types';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existingUser = await this.usersService.findByEmail(signupDto.email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(signupDto.password, 12);
    const user = await this.usersService.create(
      signupDto.email,
      signupDto.name,
      passwordHash,
    );
    const tokens = await this.generateTokens(
      this.usersService.getId(user),
      user.email,
    );

    await this.storeRefreshToken(
      this.usersService.getId(user),
      tokens.refreshToken,
    );

    return {
      accessToken: tokens.accessToken,
      user: {
        id: this.usersService.getId(user),
        email: user.email,
        name: user.name,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async signin(signinDto: SigninDto) {
    const user = await this.usersService.findByEmail(signinDto.email, true);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      signinDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userId = this.usersService.getId(user);
    const tokens = await this.generateTokens(userId, user.email);

    await this.storeRefreshToken(userId, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub, true);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = this.usersService.getId(user);
    const tokens = await this.generateTokens(userId, user.email);

    await this.storeRefreshToken(userId, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string) {
    await this.usersService.clearRefreshTokenHash(userId);

    return { message: 'Signed out successfully' };
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getAccessTokenSecret(),
        expiresIn: this.getAccessTokenExpiresIn(),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRefreshTokenSecret(),
        expiresIn: this.getRefreshTokenExpiresIn(),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);
  }

  private getAccessTokenSecret() {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'development-access-secret'
    );
  }

  private getRefreshTokenSecret() {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'development-refresh-secret'
    );
  }

  private getAccessTokenExpiresIn(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      '15m') as JwtSignOptions['expiresIn'];
  }

  private getRefreshTokenExpiresIn(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as JwtSignOptions['expiresIn'];
  }
}
