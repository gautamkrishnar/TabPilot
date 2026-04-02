import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './health/health.module';
import { JiraModule } from './jira/jira.module';
import { MetaModule } from './meta/meta.module';
import { ParticipantsModule } from './participants/participants.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/tabpilot'),
    SessionsModule,
    ParticipantsModule,
    GatewayModule,
    HealthModule,
    JiraModule,
    MetaModule,
  ],
})
export class AppModule {}
