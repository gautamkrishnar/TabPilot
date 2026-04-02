import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type ParticipantDocument = ParticipantDoc & Document;

@Schema({ timestamps: true, versionKey: false })
export class ParticipantDoc {
  @Prop({ required: true, unique: true, index: true })
  participantId: string;

  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  avatarUrl: string;

  @Prop()
  socketId?: string;

  @Prop({ default: false })
  isOnline: boolean;
}

export const ParticipantSchema = SchemaFactory.createForClass(ParticipantDoc);
