import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('me')
export class MeController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getProfile() {
    return { message: 'Welcome to the application.' };
  }
}
