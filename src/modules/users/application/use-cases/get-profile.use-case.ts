import { Injectable, NotFoundException } from '@nestjs/common';
import { IUserProfileRepository } from '../../domain/ports/user-profile.repository';
import { UserProfileEntity } from '../../domain/user-profile.entity';

@Injectable()
export class GetProfileUseCase {
  constructor(private readonly userProfileRepository: IUserProfileRepository) {}

  async execute(userId: string): Promise<UserProfileEntity> {
    const profile = await this.userProfileRepository.findById(userId);
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }
}
