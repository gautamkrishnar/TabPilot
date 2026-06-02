import { Module } from '@nestjs/common';
import { JiraModule } from '../jira/jira.module';
import { TicketScoreController } from './ticket-score.controller';
import { TicketScoreService } from './ticket-score.service';

@Module({
  imports: [JiraModule],
  controllers: [TicketScoreController],
  providers: [TicketScoreService],
})
export class TicketScoreModule {}
