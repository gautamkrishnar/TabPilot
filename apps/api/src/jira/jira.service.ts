import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

// Jira issue keys are strictly PROJECT-NUMBER (e.g. CONNCERT-2771).
// Validating before interpolation prevents path traversal / SSRF.
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/i;

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
}

function isAllowedJiraHost(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr);
    return (
      protocol === 'https:' && (hostname === 'atlassian.net' || hostname.endsWith('.atlassian.net'))
    );
  } catch {
    return false;
  }
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
    return !!(this.email && this.token);
  }

  private resolveBaseUrl(provided?: string): string {
    if (this.baseUrl) {
      if (provided && provided.replace(/\/$/, '') !== this.baseUrl) {
        throw new BadRequestException(
          `Provided baseUrl does not match the configured JIRA_BASE_URL.`,
        );
      }
      return this.baseUrl;
    }
    if (provided) {
      return provided.replace(/\/$/, '');
    }
    throw new ServiceUnavailableException(
      'Jira base URL not configured. Set JIRA_BASE_URL or provide a baseUrl parameter.',
    );
  }

  private assertAllowedUrl(url: string): string {
    if (this.baseUrl) return url;
    if (!isAllowedJiraHost(url)) {
      throw new BadRequestException('Provided baseUrl must be an https://*.atlassian.net URL.');
    }
    return url;
  }

  /** Project keys that have a story-points field configured (from JIRA_STORY_POINTS_FIELDS). */
  get configuredStoryPointProjects(): string[] {
    return Array.from(this.getStoryPointsFieldMap().keys());
  }

  /**
   * Parse JIRA_STORY_POINTS_FIELDS env var into a project-key → field-name map.
   * Format: "PROJKEY=fieldName,PROJKEY2=fieldName2"
   * e.g. "CONNCERT=customfield_10016,PAD=story_points"
   */
  private getStoryPointsFieldMap(): Map<string, string> {
    const raw = process.env.JIRA_STORY_POINTS_FIELDS ?? '';
    const map = new Map<string, string>();
    for (const entry of raw.split(',')) {
      const eqIdx = entry.indexOf('=');
      if (eqIdx === -1) continue;
      const proj = entry.slice(0, eqIdx).trim().toUpperCase();
      const field = entry.slice(eqIdx + 1).trim();
      if (proj && field) map.set(proj, field);
    }
    return map;
  }

  async getIssue(issueKey: string, providedBaseUrl?: string): Promise<JiraIssue> {
    if (!ISSUE_KEY_RE.test(issueKey)) {
      throw new BadRequestException('Invalid Jira issue key.');
    }
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Jira integration is not configured. Set JIRA_USER_EMAIL and JIRA_API_TOKEN.',
      );
    }

    const resolvedBase = this.resolveBaseUrl(providedBaseUrl);
    const auth = Buffer.from(`${this.email}:${this.token}`).toString('base64');
    const url = this.assertAllowedUrl(
      `${resolvedBase}/rest/api/3/issue/${issueKey}?fields=summary,status,issuetype`,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      this.logger.error(`Failed to reach Jira at ${resolvedBase}: ${err}`);
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

  /**
   * Write a story-points value to a Jira issue.
   * The field name is looked up per project key from JIRA_STORY_POINTS_FIELDS env var.
   */
  async setStoryPoints(issueKey: string, points: number, providedBaseUrl?: string): Promise<void> {
    if (!ISSUE_KEY_RE.test(issueKey)) {
      throw new BadRequestException('Invalid Jira issue key.');
    }
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Jira integration is not configured. Set JIRA_USER_EMAIL and JIRA_API_TOKEN.',
      );
    }

    const resolvedBase = this.resolveBaseUrl(providedBaseUrl);

    // Derive project key from issue key (e.g. "CONNCERT" from "CONNCERT-3114")
    const projectKey = issueKey.split('-')[0].toUpperCase();
    const fieldMap = this.getStoryPointsFieldMap();
    const fieldName = fieldMap.get(projectKey);
    if (!fieldName) {
      throw new BadRequestException(
        `Story points field not configured for project ${projectKey}. Add it to JIRA_STORY_POINTS_FIELDS.`,
      );
    }

    const auth = Buffer.from(`${this.email}:${this.token}`).toString('base64');
    const url = this.assertAllowedUrl(`${resolvedBase}/rest/api/3/issue/${issueKey}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ fields: { [fieldName]: points } }),
      });
    } catch (err) {
      this.logger.error(`Failed to reach Jira at ${resolvedBase}: ${err}`);
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
    if (res.status === 400) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Jira rejected story points update for ${issueKey}: ${body}`);
      throw new UnprocessableEntityException(
        `Jira rejected the story points value. Check that "${fieldName}" is the correct field for project ${projectKey}.`,
      );
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`Jira returned HTTP ${res.status}.`);
    }
  }
}
