import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type HostAddUrlPayload,
  type HostEndSessionPayload,
  type HostKickParticipantPayload,
  type HostNavigatePayload,
  type HostOpenUrlPayload,
  type HostRemoveUrlPayload,
  type HostReorderUrlsPayload,
  type HostStartSessionPayload,
  type HostToggleLockPayload,
  type JoinSessionPayload,
  type NavigateToPayload,
  type OpenTabPayload,
  type ParticipantJoinedPayload,
  type ParticipantOnlinePayload,
  type SessionStartedPayload,
  type SessionStatePayload,
  type SubmitVotePayload,
  type VoteUpdatePayload,
  WS_EVENTS,
  type WsErrorPayload,
} from '@tabpilot/shared';
import type { Server, Socket } from 'socket.io';
import { ParticipantsService } from '../participants/participants.service';
import { SessionsService } from '../sessions/sessions.service';

interface SocketMeta {
  sessionId: string;
  participantId?: string;
  isHost: boolean;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketMeta = new Map<string, SocketMeta>();

  /**
   * In-memory vote store keyed by sessionId → { participantId → value }.
   * Votes are ephemeral and reset when navigation changes.
   */
  private votes = new Map<string, Map<string, string>>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly participantsService: ParticipantsService,
  ) {}

  handleConnection(_client: Socket) {
    // Meta is populated on join_session
  }

  async handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;

    this.socketMeta.delete(client.id);

    if (meta.participantId && !meta.isHost) {
      try {
        await this.participantsService.updateOnlineStatus(meta.participantId, false);
        const payload: ParticipantOnlinePayload = {
          participantId: meta.participantId,
          isOnline: false,
        };
        this.server.to(meta.sessionId).emit(WS_EVENTS.PARTICIPANT_ONLINE, payload);
      } catch {
        // Participant may already be gone
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.JOIN_SESSION)
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionPayload,
  ) {
    const { sessionId, participantId, hostKey } = payload;

    const sessionDoc = await this.sessionsService.findById(sessionId);
    if (!sessionDoc) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      } satisfies WsErrorPayload);
      return;
    }

    const isHost = !!hostKey && (await this.sessionsService.validateHostKey(sessionId, hostKey));

    if (hostKey && !isHost) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid host key',
        code: 'INVALID_HOST_KEY',
      } satisfies WsErrorPayload);
      return;
    }

    // Block new participants from joining a locked session.
    // Reconnecting with an existing participantId is still allowed.
    if (!isHost && sessionDoc.isLocked && !participantId) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'This session is locked. The host is not accepting new participants.',
        code: 'SESSION_LOCKED',
      } satisfies WsErrorPayload);
      return;
    }

    this.socketMeta.set(client.id, {
      sessionId,
      participantId: isHost ? undefined : participantId,
      isHost,
    });

    await client.join(sessionId);

    // Resolve participant if provided
    let resolvedParticipantDoc = null;
    let wasOffline = false;
    if (!isHost && participantId) {
      resolvedParticipantDoc = await this.participantsService.findById(participantId);
      if (resolvedParticipantDoc) {
        wasOffline = !resolvedParticipantDoc.isOnline;
        await this.participantsService.updateSocketId(participantId, client.id);
        await this.participantsService.updateOnlineStatus(participantId, true);
      }
    }

    const participants = await this.participantsService.findBySession(sessionId);
    const sessionStatePayload: SessionStatePayload = {
      session: this.sessionsService.toSessionDto(sessionDoc),
      participants,
    };
    client.emit(WS_EVENTS.SESSION_STATE, sessionStatePayload);

    if (!isHost && participantId && resolvedParticipantDoc) {
      if (wasOffline) {
        // Broadcast full joined info so the room refreshes its participant list
        const participant = this.participantsService.toParticipantDto(resolvedParticipantDoc);
        const joinedPayload: ParticipantJoinedPayload = { participant };
        client.to(sessionId).emit(WS_EVENTS.PARTICIPANT_JOINED, joinedPayload);
      }

      const onlinePayload: ParticipantOnlinePayload = {
        participantId,
        isOnline: true,
      };
      this.server.to(sessionId).emit(WS_EVENTS.PARTICIPANT_ONLINE, onlinePayload);
    }

    if (sessionDoc.state === 'active' && sessionDoc.urls.length > 0) {
      const idx = sessionDoc.currentIndex;
      const url = sessionDoc.urls[idx];
      if (url) {
        const navPayload: NavigateToPayload = {
          url,
          index: idx,
          total: sessionDoc.urls.length,
        };
        client.emit(WS_EVENTS.NAVIGATE_TO, navPayload);
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.HOST_START_SESSION)
  async handleStartSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostStartSessionPayload,
  ) {
    const { sessionId, hostKey } = payload;

    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid host key',
        code: 'INVALID_HOST_KEY',
      } satisfies WsErrorPayload);
      return;
    }

    const updatedSession = await this.sessionsService.updateState(sessionId, 'active');
    const sessionDto = this.sessionsService.toSessionDto(updatedSession);

    const participants = await this.participantsService.findBySession(sessionId);
    const sessionStatePayload: SessionStatePayload = {
      session: sessionDto,
      participants,
    };
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATE, sessionStatePayload);

    const firstUrl = updatedSession.urls[0] ?? '';
    const startedPayload: SessionStartedPayload = {
      currentUrl: firstUrl,
      currentIndex: 0,
      total: updatedSession.urls.length,
    };
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STARTED, startedPayload);

    if (firstUrl) {
      const navPayload: NavigateToPayload = {
        url: firstUrl,
        index: 0,
        total: updatedSession.urls.length,
      };
      this.server.to(sessionId).emit(WS_EVENTS.NAVIGATE_TO, navPayload);
    }
  }

  @SubscribeMessage(WS_EVENTS.HOST_NAVIGATE)
  async handleNavigate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostNavigatePayload,
  ) {
    const { sessionId, hostKey, direction, index } = payload;

    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid host key',
        code: 'INVALID_HOST_KEY',
      } satisfies WsErrorPayload);
      return;
    }

    const sessionDoc = await this.sessionsService.findById(sessionId);
    if (!sessionDoc) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      } satisfies WsErrorPayload);
      return;
    }

    const total = sessionDoc.urls.length;
    if (total === 0) return;

    let newIndex = sessionDoc.currentIndex;

    if (typeof index === 'number') {
      newIndex = Math.max(0, Math.min(index, total - 1));
    } else if (direction === 'next') {
      newIndex = Math.min(sessionDoc.currentIndex + 1, total - 1);
    } else if (direction === 'prev') {
      newIndex = Math.max(sessionDoc.currentIndex - 1, 0);
    }

    // Skip if index hasn't changed
    if (newIndex === sessionDoc.currentIndex) return;

    await this.sessionsService.updateCurrentIndex(sessionId, newIndex);

    // Clear votes when navigating to a new page
    this.votes.delete(sessionId);

    const url = sessionDoc.urls[newIndex];
    if (!url) return;

    const navPayload: NavigateToPayload = {
      url,
      index: newIndex,
      total,
    };
    this.server.to(sessionId).emit(WS_EVENTS.NAVIGATE_TO, navPayload);
  }

  @SubscribeMessage(WS_EVENTS.HOST_OPEN_URL)
  async handleOpenUrl(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostOpenUrlPayload,
  ) {
    const { sessionId, hostKey, url } = payload;

    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid host key',
        code: 'INVALID_HOST_KEY',
      } satisfies WsErrorPayload);
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid URL',
        code: 'INVALID_URL',
      } satisfies WsErrorPayload);
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      client.emit(WS_EVENTS.ERROR, {
        message: 'URL must use http or https protocol',
        code: 'INVALID_URL_PROTOCOL',
      } satisfies WsErrorPayload);
      return;
    }

    const openTabPayload: OpenTabPayload = { url };
    this.server.to(sessionId).emit(WS_EVENTS.OPEN_TAB, openTabPayload);
  }

  @SubscribeMessage(WS_EVENTS.HOST_END_SESSION)
  async handleEndSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostEndSessionPayload,
  ) {
    const { sessionId, hostKey } = payload;

    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid host key',
        code: 'INVALID_HOST_KEY',
      } satisfies WsErrorPayload);
      return;
    }

    await this.sessionsService.updateState(sessionId, 'ended');
    this.votes.delete(sessionId);
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_ENDED, {});
  }

  @SubscribeMessage(WS_EVENTS.HOST_ADD_URL)
  async handleAddUrl(@ConnectedSocket() client: Socket, @MessageBody() payload: HostAddUrlPayload) {
    const { sessionId, hostKey, url } = payload;

    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      } satisfies WsErrorPayload);
      return;
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Invalid URL',
        code: 'INVALID_URL',
      } satisfies WsErrorPayload);
      return;
    }

    const updated = await this.sessionsService.addUrl(sessionId, url);
    if (!updated) return;

    const participantDtos = await this.participantsService.findBySession(sessionId);
    const stateUpdate: SessionStatePayload = {
      session: this.sessionsService.toSessionDto(updated),
      participants: participantDtos,
    };
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATE, stateUpdate);
  }

  @SubscribeMessage(WS_EVENTS.HOST_TOGGLE_LOCK)
  async handleToggleLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostToggleLockPayload,
  ) {
    const { sessionId, hostKey, locked } = payload;
    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      } satisfies WsErrorPayload);
      return;
    }
    const updated = await this.sessionsService.setLocked(sessionId, locked);
    if (!updated) return;
    const participants = await this.participantsService.findBySession(sessionId);
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATE, {
      session: this.sessionsService.toSessionDto(updated),
      participants,
    } satisfies SessionStatePayload);
  }

  @SubscribeMessage(WS_EVENTS.HOST_KICK_PARTICIPANT)
  async handleKickParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostKickParticipantPayload,
  ) {
    const { sessionId, hostKey, participantId } = payload;

    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      } satisfies WsErrorPayload);
      return;
    }

    // Hard-delete so they don't reappear on reload
    await this.participantsService.deleteParticipant(participantId);

    for (const [socketId, meta] of this.socketMeta.entries()) {
      if (meta.participantId === participantId) {
        this.server.to(socketId).emit(WS_EVENTS.KICKED, { participantId });
        this.socketMeta.delete(socketId);
        break;
      }
    }

    this.server.to(sessionId).emit(WS_EVENTS.PARTICIPANT_LEFT, { participantId });
  }

  @SubscribeMessage(WS_EVENTS.HOST_REMOVE_URL)
  async handleRemoveUrl(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostRemoveUrlPayload,
  ) {
    const { sessionId, hostKey, index } = payload;
    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      } satisfies WsErrorPayload);
      return;
    }
    const updated = await this.sessionsService.removeUrl(sessionId, index);
    if (!updated) return;
    const participants = await this.participantsService.findBySession(sessionId);
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATE, {
      session: this.sessionsService.toSessionDto(updated),
      participants,
    } satisfies SessionStatePayload);
  }

  @SubscribeMessage(WS_EVENTS.HOST_REORDER_URLS)
  async handleReorderUrls(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: HostReorderUrlsPayload,
  ) {
    const { sessionId, hostKey, fromIndex, toIndex } = payload;
    const isValid = await this.sessionsService.validateHostKey(sessionId, hostKey);
    if (!isValid) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      } satisfies WsErrorPayload);
      return;
    }
    const updated = await this.sessionsService.reorderUrls(sessionId, fromIndex, toIndex);
    if (!updated) return;
    const participants = await this.participantsService.findBySession(sessionId);
    this.server.to(sessionId).emit(WS_EVENTS.SESSION_STATE, {
      session: this.sessionsService.toSessionDto(updated),
      participants,
    } satisfies SessionStatePayload);
  }

  @SubscribeMessage(WS_EVENTS.SUBMIT_VOTE)
  async handleSubmitVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubmitVotePayload,
  ) {
    const { sessionId, participantId, value } = payload;

    const sessionDoc = await this.sessionsService.findById(sessionId);
    if (!sessionDoc) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      } satisfies WsErrorPayload);
      return;
    }

    if (!sessionDoc.votingEnabled) {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Voting is not enabled for this session',
        code: 'VOTING_DISABLED',
      } satisfies WsErrorPayload);
      return;
    }

    if (sessionDoc.state !== 'active') {
      client.emit(WS_EVENTS.ERROR, {
        message: 'Session is not active',
        code: 'SESSION_NOT_ACTIVE',
      } satisfies WsErrorPayload);
      return;
    }

    if (!this.votes.has(sessionId)) {
      this.votes.set(sessionId, new Map());
    }
    this.votes.get(sessionId)?.set(participantId, value);

    // biome-ignore lint/style/noNonNullAssertion: set on the line above, guaranteed to exist
    const sessionVotes = this.votes.get(sessionId)!;
    const votesRecord: Record<string, string> = {};
    sessionVotes.forEach((v, pid) => {
      votesRecord[pid] = v;
    });

    const voteUpdatePayload: VoteUpdatePayload = { votes: votesRecord };
    this.server.to(sessionId).emit(WS_EVENTS.VOTE_UPDATE, voteUpdatePayload);
  }
}
