import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type SessionDocument = SessionDoc & Document;

export class CoHostEntry {
  keyHash: string;
  name: string;
  email?: string;
  joinedAt: Date;
}

@Schema({ timestamps: true, versionKey: false })
export class SessionDoc {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  joinCode: string;

  @Prop({ required: true })
  hostName: string;

  @Prop()
  hostEmail?: string;

  @Prop({ required: true })
  hostKeyHash: string;

  /** Hash of the secret invite link key — lets any bearer join as a co-host. */
  @Prop({ required: true })
  hostInviteKeyHash: string;

  @Prop({
    type: [
      {
        keyHash: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String },
        joinedAt: { type: Date, required: true },
      },
    ],
    default: [],
  })
  coHosts: CoHostEntry[];

  @Prop({ type: [String], default: [] })
  urls: string[];

  @Prop({ default: 0 })
  currentIndex: number;

  @Prop({
    type: String,
    enum: ['waiting', 'active', 'ended'],
    default: 'waiting',
  })
  state: 'waiting' | 'active' | 'ended';

  @Prop({ default: false })
  votingEnabled: boolean;

  @Prop({ default: false })
  isLocked: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(SessionDoc);

// TTL index: MongoDB will automatically delete session documents once their
// expiresAt timestamp has passed (expireAfterSeconds: 0 = delete at exact time).
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
