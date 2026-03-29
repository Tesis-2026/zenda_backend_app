import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../../domain/ports/user.repository';

export interface RegisterCommand {
  email: string;
  password: string;
  fullName: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(cmd: RegisterCommand): Promise<{ accessToken: string }> {
    const existing = await this.userRepository.findByEmail(cmd.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(cmd.password, rounds);

    const user = await this.userRepository.create({
      email: cmd.email,
      passwordHash,
      fullName: cmd.fullName,
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }
}
