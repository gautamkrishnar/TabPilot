import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ParticipantDoc, ParticipantSchema } from './participant.schema';
import { ParticipantsService } from './participants.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ParticipantDoc.name, schema: ParticipantSchema }])],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
