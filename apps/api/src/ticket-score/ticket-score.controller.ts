import { Controller, Delete, Get, HttpCode, Param, Query } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JiraService } from '../jira/jira.service';
import { TicketScoreService } from './ticket-score.service';

@ApiTags('ticket-score')
@Controller('ticket-score')
export class TicketScoreController {
  constructor(
    private readonly ticketScoreService: TicketScoreService,
    private readonly jiraService: JiraService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if ticket scoring is configured' })
  @ApiResponse({ status: 200, schema: { example: { configured: true } } })
  status() {
    return {
      configured: this.ticketScoreService.isConfigured && this.jiraService.isConfigured,
    };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Score a Jira ticket for clarity and quality' })
  @ApiParam({ name: 'key', example: 'PROJ-123', description: 'Jira issue key' })
  @ApiResponse({ status: 200, description: 'Ticket score returned.' })
  @ApiResponse({ status: 503, description: 'Scoring or Jira not configured.' })
  async scoreTicket(@Param('key') key: string, @Query('baseUrl') baseUrl?: string) {
    const upperKey = key.toUpperCase();
    const issue = await this.jiraService.getIssueWithDescription(upperKey, baseUrl);
    return this.ticketScoreService.scoreTicket(upperKey, issue.summary, issue.description);
  }

  @Delete(':key')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear cached score for a ticket (triggers re-score on next GET)' })
  @ApiParam({ name: 'key', example: 'PROJ-123', description: 'Jira issue key' })
  @ApiNoContentResponse({ description: 'Cache cleared.' })
  async clearScore(@Param('key') key: string) {
    await this.ticketScoreService.clearCache(key);
  }
}
