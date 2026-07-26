import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SetStoryPointsDto {
  @IsInt()
  @Min(0)
  @Max(999)
  points: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  hostKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sessionId: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  baseUrl?: string;

  @IsOptional()
  skipExtraFields?: boolean;
}
