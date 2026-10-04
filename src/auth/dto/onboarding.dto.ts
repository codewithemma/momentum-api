import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import {
  ClientSource,
  ReferralSource,
  UserRole,
} from '../../generated/prisma/enums.js';

export class CompleteOnboardingDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ClientSource, { each: true })
  clientSources: ClientSource[];

  @IsEnum(ReferralSource)
  @IsNotEmpty()
  referralSource: ReferralSource;
}
