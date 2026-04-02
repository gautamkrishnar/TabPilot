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

  async create(sessionId: string, name: string, email?: string): Promise<Participant> {
    const participantId = uuidv4();
    const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${participantId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    const doc = await this.participantModel.create({
      participantId,
      sessionId,
      name,
      email,
      avatarUrl,
      isOnline: false,
    });

    return this.toParticipantDto(doc);
  }

  async findById(participantId: string): Promise<ParticipantDocument | null> {
    return this.participantModel.findOne({ participantId }).exec();
  }

  async findBySession(sessionId: string): Promise<Participant[]> {
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
