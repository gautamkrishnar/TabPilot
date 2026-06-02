import 'reflect-metadata';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { JiraService } from './jira.service';

describe('JiraService', () => {
  let service: JiraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JiraService],
    }).compile();

    service = module.get<JiraService>(JiraService);
    jest.resetAllMocks();
  });

  describe('isConfigured', () => {
    it('returns false when env vars are missing', () => {
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      expect(service.isConfigured).toBe(false);
    });

    it('returns true when only email and token are set (baseUrl optional)', () => {
      delete process.env.JIRA_BASE_URL;
      process.env.JIRA_USER_EMAIL = 'user@example.com';
      process.env.JIRA_API_TOKEN = 'token123';
      expect(service.isConfigured).toBe(true);
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });

    it('returns true when all env vars are set', () => {
      process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
      process.env.JIRA_USER_EMAIL = 'user@example.com';
      process.env.JIRA_API_TOKEN = 'token123';
      expect(service.isConfigured).toBe(true);
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });
  });

  describe('getIssue()', () => {
    it('throws BadRequestException for invalid issue key format', async () => {
      await expect(service.getIssue('not-valid')).rejects.toThrow(BadRequestException);
      await expect(service.getIssue('../etc/passwd')).rejects.toThrow(BadRequestException);
      await expect(service.getIssue('')).rejects.toThrow(BadRequestException);
    });

    it('throws ServiceUnavailableException when Jira is not configured', async () => {
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      await expect(service.getIssue('PROJ-123')).rejects.toThrow(ServiceUnavailableException);
    });

    it('uses provided baseUrl when JIRA_BASE_URL is not set', async () => {
      delete process.env.JIRA_BASE_URL;
      process.env.JIRA_USER_EMAIL = 'user@example.com';
      process.env.JIRA_API_TOKEN = 'token123';
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          fields: { summary: 'Test', status: { name: 'Open' }, issuetype: { name: 'Bug' } },
        }),
      } as unknown as Response);

      await service.getIssue('PROJ-123', 'https://myorg.atlassian.net');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://myorg.atlassian.net/rest/api/3/issue/PROJ-123?fields=summary,status,issuetype',
        expect.any(Object),
      );
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });

    it('rejects non-atlassian baseUrl to prevent SSRF', async () => {
      delete process.env.JIRA_BASE_URL;
      process.env.JIRA_USER_EMAIL = 'user@example.com';
      process.env.JIRA_API_TOKEN = 'token123';
      await expect(service.getIssue('PROJ-123', 'https://evil.com')).rejects.toThrow(
        BadRequestException,
      );
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });

    it('throws ServiceUnavailableException when no baseUrl is available', async () => {
      delete process.env.JIRA_BASE_URL;
      process.env.JIRA_USER_EMAIL = 'user@example.com';
      process.env.JIRA_API_TOKEN = 'token123';
      await expect(service.getIssue('PROJ-123')).rejects.toThrow(ServiceUnavailableException);
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
    });

    describe('with Jira configured', () => {
      beforeEach(() => {
        process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
        process.env.JIRA_USER_EMAIL = 'user@example.com';
        process.env.JIRA_API_TOKEN = 'token123';
      });

      afterEach(() => {
        delete process.env.JIRA_BASE_URL;
        delete process.env.JIRA_USER_EMAIL;
        delete process.env.JIRA_API_TOKEN;
      });

      it('rejects a provided baseUrl that differs from JIRA_BASE_URL', async () => {
        await expect(service.getIssue('PROJ-123', 'https://other.atlassian.net')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects a provided baseUrl that differs from self-hosted JIRA_BASE_URL', async () => {
        process.env.JIRA_BASE_URL = 'https://jira.mycompany.com';
        await expect(service.getIssue('PROJ-123', 'https://other.atlassian.net')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('allows a provided baseUrl that matches JIRA_BASE_URL', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({
            fields: { summary: 'Test', status: { name: 'Open' }, issuetype: { name: 'Bug' } },
          }),
        } as unknown as Response);
        await expect(
          service.getIssue('PROJ-123', 'https://example.atlassian.net'),
        ).resolves.toBeDefined();
      });

      it('throws ServiceUnavailableException when fetch fails', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
        await expect(service.getIssue('PROJ-123')).rejects.toThrow(ServiceUnavailableException);
      });

      it('throws ServiceUnavailableException on 401', async () => {
        global.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false } as Response);
        await expect(service.getIssue('PROJ-123')).rejects.toThrow(ServiceUnavailableException);
      });

      it('throws NotFoundException on 404', async () => {
        global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false } as Response);
        await expect(service.getIssue('PROJ-123')).rejects.toThrow(NotFoundException);
      });

      it('throws ServiceUnavailableException on other non-ok status', async () => {
        global.fetch = jest.fn().mockResolvedValue({ status: 500, ok: false } as Response);
        await expect(service.getIssue('PROJ-123')).rejects.toThrow(ServiceUnavailableException);
      });

      it('returns mapped issue on success', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({
            fields: {
              summary: 'Fix the bug',
              status: { name: 'In Progress' },
              issuetype: { name: 'Bug' },
            },
          }),
        } as unknown as Response);

        const issue = await service.getIssue('PROJ-123');
        expect(issue).toEqual({
          key: 'PROJ-123',
          summary: 'Fix the bug',
          status: 'In Progress',
          issueType: 'Bug',
        });
      });

      it('falls back gracefully when fields are missing', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          ok: true,
          json: async () => ({ fields: {} }),
        } as unknown as Response);

        const issue = await service.getIssue('PROJ-456');
        expect(issue.summary).toBe('PROJ-456');
        expect(issue.status).toBe('Unknown');
        expect(issue.issueType).toBe('Issue');
      });
    });
  });

  describe('setStoryPoints()', () => {
    it('throws BadRequestException for invalid issue key format', async () => {
      await expect(service.setStoryPoints('not-valid', 5)).rejects.toThrow(BadRequestException);
    });

    it('throws ServiceUnavailableException when Jira is not configured', async () => {
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('uses provided baseUrl for setStoryPoints when JIRA_BASE_URL is not set', async () => {
      delete process.env.JIRA_BASE_URL;
      process.env.JIRA_USER_EMAIL = 'user@example.com';
      process.env.JIRA_API_TOKEN = 'token123';
      process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
      global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

      await service.setStoryPoints('PROJ-123', 5, 'https://myorg.atlassian.net');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://myorg.atlassian.net/rest/api/3/issue/PROJ-123',
        expect.any(Object),
      );
      delete process.env.JIRA_USER_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_STORY_POINTS_FIELDS;
    });

    describe('with Jira configured', () => {
      beforeEach(() => {
        process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
        process.env.JIRA_USER_EMAIL = 'user@example.com';
        process.env.JIRA_API_TOKEN = 'token123';
      });

      afterEach(() => {
        delete process.env.JIRA_BASE_URL;
        delete process.env.JIRA_USER_EMAIL;
        delete process.env.JIRA_API_TOKEN;
        delete process.env.JIRA_STORY_POINTS_FIELDS;
      });

      it('throws BadRequestException when project is not in JIRA_STORY_POINTS_FIELDS', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'OTHER=story_points';
        await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when JIRA_STORY_POINTS_FIELDS is not set', async () => {
        delete process.env.JIRA_STORY_POINTS_FIELDS;
        await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(BadRequestException);
      });

      it('throws ServiceUnavailableException when fetch fails', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
        await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(
          ServiceUnavailableException,
        );
      });

      it('throws ServiceUnavailableException on 401', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        global.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false } as Response);
        await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(
          ServiceUnavailableException,
        );
      });

      it('throws NotFoundException on 404', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false } as Response);
        await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(NotFoundException);
      });

      it('throws UnprocessableEntityException on 400 (field rejected)', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        global.fetch = jest.fn().mockResolvedValue({
          status: 400,
          ok: false,
          text: async () => 'Field not found',
        } as unknown as Response);
        await expect(service.setStoryPoints('PROJ-123', 5)).rejects.toThrow(
          UnprocessableEntityException,
        );
      });

      it('resolves successfully on 204 (no content)', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);
        await expect(service.setStoryPoints('PROJ-123', 5)).resolves.toBeUndefined();
      });

      it('uses the correct field name from JIRA_STORY_POINTS_FIELDS', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=customfield_10016';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 8);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({ customfield_10016: 8 });
      });

      it('parses multiple projects from JIRA_STORY_POINTS_FIELDS', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'ALPHA=story_points,BETA=customfield_10016';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('BETA-99', 3);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({ customfield_10016: 3 });
      });

      it('includes extra fields from JIRA_EXTRA_FIELDS alongside story points', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        process.env.JIRA_EXTRA_FIELDS = '{"PROJ":{"customfield_10517":{"id":"10852"}}}';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 5);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({
          story_points: 5,
          customfield_10517: { id: '10852' },
        });
      });

      it('does not include extra fields when JIRA_EXTRA_FIELDS is not set', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        delete process.env.JIRA_EXTRA_FIELDS;
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 5);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({ story_points: 5 });
      });

      it('does not include extra fields when project is not in JIRA_EXTRA_FIELDS', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        process.env.JIRA_EXTRA_FIELDS = '{"OTHER":{"customfield_10517":{"id":"10852"}}}';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 5);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({ story_points: 5 });
      });

      it('supports multiple extra fields per project', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        process.env.JIRA_EXTRA_FIELDS =
          '{"PROJ":{"customfield_10517":{"id":"10852"},"customfield_10028":42}}';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 3);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({
          story_points: 3,
          customfield_10517: { id: '10852' },
          customfield_10028: 42,
        });
      });

      it('ignores invalid JSON in JIRA_EXTRA_FIELDS', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        process.env.JIRA_EXTRA_FIELDS = 'not-valid-json';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 5);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields).toEqual({ story_points: 5 });
      });

      it('is case-insensitive for project keys in JIRA_EXTRA_FIELDS', async () => {
        process.env.JIRA_STORY_POINTS_FIELDS = 'PROJ=story_points';
        process.env.JIRA_EXTRA_FIELDS = '{"proj":{"customfield_10517":{"id":"10852"}}}';
        global.fetch = jest.fn().mockResolvedValue({ status: 204, ok: true } as Response);

        await service.setStoryPoints('PROJ-123', 5);

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.fields.customfield_10517).toEqual({ id: '10852' });
      });
    });
  });
});
