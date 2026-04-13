import { Injectable } from '@nestjs/common';
import {
  IUserProfileRepository,
  UpdateProfileData,
} from '../../domain/ports/user-profile.repository';
import { UserProfileEntity } from '../../domain/user-profile.entity';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly userProfileRepository: IUserProfileRepository) {}

  async execute(
    userId: string,
    data: UpdateProfileData,
  ): Promise<UserProfileEntity> {
    return this.userProfileRepository.update(userId, data);
  }
}
