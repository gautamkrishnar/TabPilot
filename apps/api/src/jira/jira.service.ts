import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  private get baseUrl(): string | undefined {
    return process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  }

  private get email(): string | undefined {
    return process.env.JIRA_USER_EMAIL;
  }

  private get token(): string | undefined {
    return process.env.JIRA_API_TOKEN;
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && this.email && this.token);
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Jira integration is not configured. Set JIRA_BASE_URL, JIRA_USER_EMAIL and JIRA_API_TOKEN.',
      );
    }

    const auth = Buffer.from(`${this.email}:${this.token}`).toString('base64');
    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}?fields=summary,status,issuetype`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      this.logger.error(`Failed to reach Jira at ${this.baseUrl}: ${err}`);
      throw new ServiceUnavailableException('Could not reach Jira instance.');
    }

    if (res.status === 401) {
      throw new ServiceUnavailableException(
        'Jira authentication failed. Check JIRA_USER_EMAIL and JIRA_API_TOKEN.',
      );
    }
    if (res.status === 404) {
      throw new NotFoundException(`Jira issue ${issueKey} not found.`);
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`Jira returned HTTP ${res.status}.`);
    }

    const data = (await res.json()) as {
      fields: { summary: string; status: { name: string }; issuetype: { name: string } };
    };

    return {
      key: issueKey,
      summary: data.fields?.summary ?? issueKey,
      status: data.fields?.status?.name ?? 'Unknown',
      issueType: data.fields?.issuetype?.name ?? 'Issue',
    };
  }
}
