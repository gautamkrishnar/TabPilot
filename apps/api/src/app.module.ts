import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './health/health.module';
import { JiraModule } from './jira/jira.module';
import { MetaModule } from './meta/meta.module';
import { ParticipantsModule } from './participants/participants.module';
import { SessionsModule } from './sessions/sessions.module';
import { ProxyAwareThrottlerGuard } from './throttler.guard';
import { TicketScoreModule } from './ticket-score/ticket-score.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/tabpilot'),
    SessionsModule,
    ParticipantsModule,
    GatewayModule,
    HealthModule,
    JiraModule,
    MetaModule,
    TicketScoreModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ProxyAwareThrottlerGuard }],
})
export class AppModule {}
