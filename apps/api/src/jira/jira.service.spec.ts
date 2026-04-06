import 'reflect-metadata';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
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
});
