import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type TicketScoreDocument = TicketScoreDoc & Document;

@Schema({ versionKey: false })
export class TicketScoreDoc {
  @Prop({ required: true, unique: true, index: true })
  issueKey: string;

  @Prop({ required: true })
  overall: number;

  @Prop({ type: Object, required: true })
  dimensions: {
    clarity: { score: number; feedback: string };
    completeness: { score: number; feedback: string };
    actionability: { score: number; feedback: string };
    testability: { score: number; feedback: string };
    formatting: { score: number; feedback: string };
    context: { score: number; feedback: string };
  };

  @Prop({ required: true })
  scoredAt: Date;
}

export const TicketScoreSchema = SchemaFactory.createForClass(TicketScoreDoc);
