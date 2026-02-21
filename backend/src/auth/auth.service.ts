import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    // createUser already throws ConflictException on duplicate email
    // and handles password hashing internally
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });

    return this.signToken(user.id, user.role);
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    // findByEmail returns the raw User (with passwordHash) or null
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.role);
  }

  private signToken(userId: string, role: string): { access_token: string } {
    const payload: { sub: string; role: string } = { sub: userId, role };
    return { access_token: this.jwtService.sign(payload) };
  }
}
