import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBody,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JiraService } from './jira.service';

@ApiTags('jira')
@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if Jira integration is configured' })
  @ApiResponse({ status: 200, schema: { example: { configured: true } } })
  status() {
    return {
      configured: this.jiraService.isConfigured,
      storyPointProjects: this.jiraService.configuredStoryPointProjects,
    };
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

  @Patch('issue/:key/story-points')
  @ApiOperation({
    summary: 'Update the story-points field on a Jira issue',
    description:
      "Writes a story-points value to the configured field for the issue's project. " +
      'The per-project field name is set via the JIRA_STORY_POINTS_FIELDS env var ' +
      '(format: "PROJKEY=fieldName,PROJKEY2=fieldName2").',
  })
  @ApiParam({ name: 'key', example: 'CONNCERT-3114', description: 'Jira issue key' })
  @ApiBody({ schema: { example: { points: 5 } } })
  @ApiNoContentResponse({ description: 'Story points updated successfully.' })
  @ApiNotFoundResponse({ description: 'Issue not found in Jira.' })
  @ApiResponse({ status: 400, description: 'Invalid key or project not configured.' })
  @ApiResponse({ status: 503, description: 'Jira not configured or unreachable.' })
  setStoryPoints(@Param('key') key: string, @Body() body: { points: number }) {
    return this.jiraService.setStoryPoints(key.toUpperCase(), body.points);
  }
}
