import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';

@Module({
  imports: [SessionsModule],
  controllers: [JiraController],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}
