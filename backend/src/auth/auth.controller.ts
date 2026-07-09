import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './types';

const refreshTokenCookieName = 'refreshToken';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(signupDto);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return this.withoutRefreshToken(result);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signin(
    @Body() signinDto: SigninDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signin(signinDto);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return this.withoutRefreshToken(result);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(
      req.cookies?.[refreshTokenCookieName],
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return this.withoutRefreshToken(result);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(req.user.sub);

    res.clearCookie(refreshTokenCookieName, this.getRefreshCookieOptions());

    return result;
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(
      refreshTokenCookieName,
      refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
      sameSite: 'lax' as const,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };
  }

  private withoutRefreshToken<T extends { refreshToken: string }>(result: T) {
    const responseBody: Partial<T> = { ...result };

    delete responseBody.refreshToken;

    return responseBody;
  }
}
