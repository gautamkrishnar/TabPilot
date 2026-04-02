import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JiraService } from './jira.service';

@ApiTags('jira')
@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if Jira integration is configured' })
  @ApiResponse({ status: 200, schema: { example: { configured: true } } })
  status() {
    return { configured: this.jiraService.isConfigured };
  }

  @Get('issue/:key')
  @ApiOperation({
    summary: 'Fetch a Jira issue by key',
    description:
      'Proxies to the configured Jira instance. Returns the issue summary, status, and type. ' +
      'Requires JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN to be set on the server.',
  })
  @ApiParam({ name: 'key', example: 'CONNCERT-2771', description: 'Jira issue key' })
  @ApiResponse({
    status: 200,
    description: 'Issue found.',
    schema: {
      example: {
        key: 'CONNCERT-2771',
        summary: 'Fix login bug',
        status: 'In Progress',
        issueType: 'Bug',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Issue not found in Jira.' })
  @ApiResponse({ status: 503, description: 'Jira not configured or unreachable.' })
  getIssue(@Param('key') key: string) {
    return this.jiraService.getIssue(key.toUpperCase());
  }
}
