import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Participant } from '@tabpilot/shared';
import type { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ParticipantDoc, type ParticipantDocument } from './participant.schema';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(ParticipantDoc.name)
    private readonly participantModel: Model<ParticipantDocument>,
  ) {}

  async create(
    sessionId: string,
    name: string,
    email?: string,
    participantSecretHash?: string,
  ): Promise<Participant> {
    const participantId = uuidv4();
    const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${participantId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    const doc = await this.participantModel.create({
      participantId,
      sessionId,
      name,
      email,
      avatarUrl,
      isOnline: false,
      participantSecretHash,
    });

    return this.toParticipantDto(doc);
  }

  async verifyParticipantSecret(participantId: string, secret: string): Promise<boolean> {
    const participant = await this.findById(participantId);
    if (!participant?.participantSecretHash) return false;
    const hash = createHash('sha256').update(secret).digest('hex');
    return hash === participant.participantSecretHash;
  }

  async findById(participantId: string): Promise<ParticipantDocument | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId)) {
      return null;
    }
    return this.participantModel.findOne({ participantId }).exec();
  }

  async findBySession(sessionId: string): Promise<Participant[]> {
    // Validate sessionId is a UUID before querying to prevent NoSQL injection.
    // Mongoose parameterises queries, but the explicit guard satisfies static analysis
    // and adds defence-in-depth against unexpected operator injection (e.g. {$gt:""}).
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      return [];
    }
    const docs = await this.participantModel.find({ sessionId }).exec();
    return docs.map((doc) => this.toParticipantDto(doc));
  }

  async updateSocketId(participantId: string, socketId: string): Promise<ParticipantDocument> {
    const doc = await this.participantModel
      .findOneAndUpdate({ participantId }, { socketId }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Participant ${participantId} not found`);
    return doc;
  }

  async updateProfile(
    participantId: string,
    name: string,
    email = '',
  ): Promise<ParticipantDocument> {
    const update: Record<string, unknown> = { name, email: email || null };
    const doc = await this.participantModel
      .findOneAndUpdate({ participantId }, update, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Participant ${participantId} not found`);
    return doc;
  }

  async updateOnlineStatus(participantId: string, isOnline: boolean): Promise<ParticipantDocument> {
    const doc = await this.participantModel
      .findOneAndUpdate({ participantId }, { isOnline }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Participant ${participantId} not found`);
    return doc;
  }

  toParticipantDto(doc: ParticipantDocument): Participant {
    const obj = doc.toObject() as ParticipantDoc & { createdAt?: Date };
    return {
      id: obj.participantId,
      sessionId: obj.sessionId,
      name: obj.name,
      email: obj.email,
      avatarUrl: obj.avatarUrl,
      isOnline: obj.isOnline,
      joinedAt: obj.createdAt ? obj.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  async deleteParticipant(participantId: string): Promise<void> {
    await this.participantModel.deleteOne({ participantId }).exec();
  }

  async deleteAllForSession(sessionId: string): Promise<void> {
    await this.participantModel.deleteMany({ sessionId }).exec();
  }
}
