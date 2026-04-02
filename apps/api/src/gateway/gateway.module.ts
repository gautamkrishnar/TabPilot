import { Module } from '@nestjs/common';
import { ParticipantsModule } from '../participants/participants.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SessionGateway } from './session.gateway';

@Module({
  imports: [SessionsModule, ParticipantsModule],
  providers: [SessionGateway],
})
export class GatewayModule {}
