import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinSessionDto {
  @ApiProperty({ example: 'Alice Chen', maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'alice@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Existing participantId for reconnecting after a browser refresh',
  })
  @IsOptional()
  @IsString()
  participantId?: string;
}
