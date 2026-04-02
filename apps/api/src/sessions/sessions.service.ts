import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CreateSessionResponse, Session, SessionState } from '@tabpilot/shared';
import type { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionDoc, type SessionDocument } from './session.schema';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(SessionDoc.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(dto: CreateSessionDto): Promise<CreateSessionResponse> {
    const sessionId = uuidv4();
    const joinCode = generateJoinCode();
    const hostKey = uuidv4();
    const hostKeyHash = hashKey(hostKey);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.expiryDays);

    const doc = await this.sessionModel.create({
      sessionId,
      name: dto.name,
      joinCode,
      hostName: dto.hostName,
      hostEmail: dto.hostEmail,
      hostKeyHash,
      urls: dto.urls,
      currentIndex: 0,
      state: 'waiting',
      votingEnabled: dto.votingEnabled ?? false,
      expiresAt,
    });

    return {
      session: this.toSessionDto(doc),
      hostKey,
    };
  }

  async findById(sessionId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findOne({ sessionId }).exec();
  }

  async findByJoinCode(code: string): Promise<SessionDocument | null> {
    return this.sessionModel.findOne({ joinCode: code.toUpperCase() }).exec();
  }

  async validateHostKey(sessionId: string, hostKey: string): Promise<boolean> {
    const doc = await this.findById(sessionId);
    if (!doc) return false;
    return doc.hostKeyHash === hashKey(hostKey);
  }

  async updateState(sessionId: string, state: SessionState): Promise<SessionDocument> {
    const doc = await this.sessionModel
      .findOneAndUpdate({ sessionId }, { state }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Session ${sessionId} not found`);
    return doc;
  }

  async updateCurrentIndex(sessionId: string, index: number): Promise<SessionDocument> {
    const doc = await this.sessionModel
      .findOneAndUpdate({ sessionId }, { currentIndex: index }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Session ${sessionId} not found`);
    return doc;
  }

  toSessionDto(doc: SessionDocument): Session {
    const obj = doc.toObject() as SessionDoc & {
      createdAt?: Date;
      updatedAt?: Date;
    };
    return {
      id: obj.sessionId,
      name: obj.name,
      joinCode: obj.joinCode,
      hostName: obj.hostName,
      hostEmail: obj.hostEmail,
      urls: obj.urls,
      currentIndex: obj.currentIndex,
      state: obj.state,
      votingEnabled: obj.votingEnabled,
      isLocked: obj.isLocked ?? false,
      createdAt: obj.createdAt ? obj.createdAt.toISOString() : new Date().toISOString(),
      expiresAt: obj.expiresAt.toISOString(),
    };
  }

  async updateHostProfile(sessionId: string, name: string, email = ''): Promise<SessionDocument> {
    const update: Record<string, unknown> = { hostName: name, hostEmail: email || null };
    const doc = await this.sessionModel
      .findOneAndUpdate({ sessionId }, update, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Session ${sessionId} not found`);
    return doc;
  }

  async setLocked(sessionId: string, isLocked: boolean): Promise<SessionDocument | null> {
    return this.sessionModel.findOneAndUpdate({ sessionId }, { isLocked }, { new: true }).exec();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionModel.deleteOne({ sessionId }).exec();
  }

  async addUrl(sessionId: string, url: string): Promise<SessionDocument | null> {
    return this.sessionModel
      .findOneAndUpdate({ sessionId }, { $push: { urls: url } }, { new: true })
      .exec();
  }

  async removeUrl(sessionId: string, index: number): Promise<SessionDocument | null> {
    const doc = await this.sessionModel.findOne({ sessionId }).exec();
    if (!doc || index < 0 || index >= doc.urls.length) return null;

    const urls = [...doc.urls];
    urls.splice(index, 1);

    let currentIndex = doc.currentIndex;
    if (urls.length === 0) {
      currentIndex = 0;
    } else if (index < currentIndex) {
      currentIndex = Math.max(0, currentIndex - 1);
    } else if (index === currentIndex) {
      currentIndex = Math.min(currentIndex, urls.length - 1);
    }

    return this.sessionModel
      .findOneAndUpdate({ sessionId }, { urls, currentIndex }, { new: true })
      .exec();
  }

  async reorderUrls(
    sessionId: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<SessionDocument | null> {
    const doc = await this.sessionModel.findOne({ sessionId }).exec();
    if (!doc) return null;

    const urls = [...doc.urls];
    const { currentIndex } = doc;

    // Only strictly-future items (index > currentIndex) may be reordered
    if (
      fromIndex < 0 ||
      fromIndex >= urls.length ||
      toIndex < 0 ||
      toIndex >= urls.length ||
      fromIndex === toIndex ||
      fromIndex <= currentIndex ||
      toIndex <= currentIndex
    )
      return doc;

    const [moved] = urls.splice(fromIndex, 1);
    urls.splice(toIndex, 0, moved);

    return this.sessionModel.findOneAndUpdate({ sessionId }, { urls }, { new: true }).exec();
  }
}
