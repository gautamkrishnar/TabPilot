import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinAsCoHostDto {
  @ApiProperty({
    description: 'Secret host invite key obtained from the invite link',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  inviteKey: string;

  @ApiProperty({ example: 'Alex Rivera', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'alex@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
