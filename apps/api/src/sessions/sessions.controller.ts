import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CreateSessionResponse, JoinSessionResponse } from '@tabpilot/shared';
import { IsString } from 'class-validator';
import { ParticipantsService } from '../participants/participants.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SessionsService } from './sessions.service';

class DeleteSessionDto {
  @IsString()
  hostKey: string;
}

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly participantsService: ParticipantsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a session',
    description:
      'Creates a new grooming session. Returns the session details and a one-time host key — store it securely in localStorage, as it cannot be recovered.',
  })
  @ApiResponse({ status: 201, description: 'Session created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error — check request body.' })
  async create(@Body() dto: CreateSessionDto): Promise<CreateSessionResponse> {
    return this.sessionsService.create(dto);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: 'Look up a session by join code',
    description:
      'Used by participants to verify a 6-character join code before entering their name.',
  })
  @ApiParam({ name: 'code', example: 'A3X7KP', description: '6-character alphanumeric join code' })
  @ApiResponse({ status: 200, description: 'Session found.' })
  @ApiNotFoundResponse({ description: 'No session matches the given join code.' })
  async findByCode(@Param('code') code: string) {
    const doc = await this.sessionsService.findByJoinCode(code);
    if (!doc) throw new NotFoundException(`Session with code ${code} not found`);
    return this.sessionsService.toSessionDto(doc);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session found.' })
  @ApiNotFoundResponse({ description: 'Session not found.' })
  async findById(@Param('id') id: string) {
    const doc = await this.sessionsService.findById(id);
    if (!doc) throw new NotFoundException(`Session ${id} not found`);
    return this.sessionsService.toSessionDto(doc);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a session (host only)',
    description: 'Permanently deletes a session and all its participants. Requires the host key.',
  })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiBody({ schema: { example: { hostKey: 'uuid-host-key' } } })
  @ApiResponse({ status: 200, description: 'Session deleted.' })
  @ApiNotFoundResponse({ description: 'Session not found.' })
  @ApiResponse({ status: 401, description: 'Invalid host key.' })
  async deleteSession(@Param('id') id: string, @Body() dto: DeleteSessionDto) {
    const doc = await this.sessionsService.findById(id);
    if (!doc) throw new NotFoundException(`Session ${id} not found`);

    const isValid = await this.sessionsService.validateHostKey(id, dto.hostKey);
    if (!isValid) throw new UnauthorizedException('Invalid host key.');

    // Delete all participants first, then the session
    await this.participantsService.deleteAllForSession(id);
    await this.sessionsService.deleteSession(id);

    return { deleted: true };
  }

  @Post(':id/join')
  @ApiOperation({
    summary: 'Join a session as a participant',
    description:
      'Creates a new participant record and returns their identity. ' +
      'Pass an existing `participantId` in the body to re-join after a browser refresh.',
  })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 201, description: 'Joined successfully.' })
  @ApiNotFoundResponse({ description: 'Session not found.' })
  async join(@Param('id') id: string, @Body() dto: JoinSessionDto): Promise<JoinSessionResponse> {
    const sessionDoc = await this.sessionsService.findById(id);
    if (!sessionDoc) throw new NotFoundException(`Session ${id} not found`);

    if (sessionDoc.isLocked && !dto.participantId) {
      throw new BadRequestException(
        'This session is locked. The host is not accepting new participants.',
      );
    }

    if (dto.participantId) {
      const existing = await this.participantsService.findById(dto.participantId);
      if (existing) {
        return {
          session: this.sessionsService.toSessionDto(sessionDoc),
          participant: this.participantsService.toParticipantDto(existing),
        };
      }
    }

    const participant = await this.participantsService.create(id, dto.name, dto.email);

    return {
      session: this.sessionsService.toSessionDto(sessionDoc),
      participant,
    };
  }
}
