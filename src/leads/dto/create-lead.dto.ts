import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { LeadSource, LeadStatus } from '../../generated/prisma/enums.js';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  company?: string;

  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @ValidateIf((_, value) => value !== '')
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @ValidateIf((_, value) => value !== '')
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateIf((_, value) => value !== '')
  @IsDateString()
  nextFollowUpAt?: string | null;
}
