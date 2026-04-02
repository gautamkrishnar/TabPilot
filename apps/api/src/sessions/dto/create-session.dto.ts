import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Sprint 42 Grooming', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Gautam Krishna', maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  hostName: string;

  @ApiPropertyOptional({ example: 'gautam@company.com' })
  @IsOptional()
  @IsEmail()
  hostEmail?: string;

  @ApiProperty({
    example: ['https://linear.app/team/issue/SPRINT-101', 'https://github.com/org/repo/issues/42'],
    maxItems: 50,
    description: 'List of ticket URLs to review. Must be valid http/https URLs.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsUrl({}, { each: true })
  urls: string[];

  @ApiProperty({ example: 7, minimum: 1, maximum: 30, description: 'Days until session expires' })
  @IsInt()
  @Min(1)
  @Max(30)
  expiryDays: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  votingEnabled?: boolean;
}
