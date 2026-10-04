import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto.js';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
