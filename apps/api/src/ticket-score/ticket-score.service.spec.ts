import 'reflect-metadata';
import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { TicketScoreDoc } from './ticket-score.schema';
import { TicketScoreService } from './ticket-score.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

jest.mock('node:fs', () => {
  const actual = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

import * as nodeDns from 'node:dns/promises';
import * as nodeFs from 'node:fs';

const mockExistsSync = nodeFs.existsSync as jest.Mock;
const mockReadFileSync = nodeFs.readFileSync as jest.Mock;
const mockLookup = nodeDns.lookup as jest.Mock;

const VALID_RESPONSE = {
  overall: 72,
  dimensions: {
    clarity: { score: 80, feedback: 'Clear requirements.' },
    completeness: { score: 65, feedback: 'Missing edge cases.' },
    actionability: { score: 75, feedback: 'Mostly actionable.' },
    testability: { score: 60, feedback: 'No acceptance criteria.' },
    formatting: { score: 85, feedback: 'Well structured.' },
    context: { score: 67, feedback: 'Needs more background.' },
  },
};

const mockScoreModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
};

function chainableFindOne(result: unknown) {
  mockScoreModel.findOne.mockReturnValue({
    lean: () => ({ exec: () => Promise.resolve(result) }),
  });
}

function chainableDeleteOne() {
  mockScoreModel.deleteOne.mockReturnValue({ exec: () => Promise.resolve() });
}

describe('TicketScoreService', () => {
  let service: TicketScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketScoreService,
        { provide: getModelToken(TicketScoreDoc.name), useValue: mockScoreModel },
      ],
    }).compile();

    service = module.get<TicketScoreService>(TicketScoreService);
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('returns false when GOOGLE_APPLICATION_CREDENTIALS is not set', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      expect(service.isConfigured).toBe(false);
    });

    it('returns false when credentials file does not exist', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/nonexistent/path.json';
      mockExistsSync.mockReturnValue(false);
      expect(service.isConfigured).toBe(false);
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    });

    it('returns true when credentials file exists', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/valid/sa.json';
      mockExistsSync.mockReturnValue(true);
      expect(service.isConfigured).toBe(true);
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    });
  });

  describe('scoreTicket()', () => {
    beforeEach(() => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/valid/sa.json';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ project_id: 'test-project' }));
      chainableFindOne(null);
      mockScoreModel.create.mockResolvedValue({});
    });

    afterEach(() => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.VERTEX_AI_LOCATION;
    });

    it('throws ServiceUnavailableException when credentials are not set', async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const module = await Test.createTestingModule({
        providers: [
          TicketScoreService,
          { provide: getModelToken(TicketScoreDoc.name), useValue: mockScoreModel },
        ],
      }).compile();
      const freshService = module.get<TicketScoreService>(TicketScoreService);

      await expect(freshService.scoreTicket('PROJ-1', 'Summary', 'Description')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('returns parsed score on valid Gemini response', async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.scoreTicket(
        'PROJ-2',
        'Fix login bug',
        'The login page crashes on submit',
      );
      expect(result).toEqual(VALID_RESPONSE);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockScoreModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ issueKey: 'PROJ-2', overall: 72 }),
      );
    });

    it('returns cached result from MongoDB without calling Gemini', async () => {
      chainableFindOne({ issueKey: 'PROJ-5', ...VALID_RESPONSE, scoredAt: new Date() });

      const result = await service.scoreTicket('PROJ-5', 'Summary', 'Description');
      expect(result).toEqual(VALID_RESPONSE);
      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(mockScoreModel.create).not.toHaveBeenCalled();
    });

    it('calls Gemini again after cache is cleared', async () => {
      chainableDeleteOne();
      await service.clearCache('PROJ-6');
      expect(mockScoreModel.deleteOne).toHaveBeenCalledWith({ issueKey: 'PROJ-6' });
    });

    it('throws ServiceUnavailableException when Gemini returns empty text', async () => {
      mockGenerateContent.mockResolvedValue({ text: '' });
      await expect(service.scoreTicket('PROJ-3', 'Summary', 'Description')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when Gemini returns null text', async () => {
      mockGenerateContent.mockResolvedValue({ text: null });
      await expect(service.scoreTicket('PROJ-3', 'Summary', 'Description')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when Gemini returns invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue({ text: 'not json at all' });
      await expect(service.scoreTicket('PROJ-3', 'Summary', 'Description')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when Gemini response is missing required fields', async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ foo: 'bar' }) });
      await expect(service.scoreTicket('PROJ-3', 'Summary', 'Description')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when Gemini API call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));
      await expect(service.scoreTicket('PROJ-3', 'Summary', 'Description')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('handles description being empty', async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.scoreTicket('PROJ-4', 'Summary only', '');
      expect(result).toEqual(VALID_RESPONSE);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents).toContain('(no description provided)');
    });

    it('getCached returns null for uncached keys', async () => {
      chainableFindOne(null);
      expect(await service.getCached('NONEXISTENT-1')).toBeNull();
    });

    it('getCached returns score for cached keys', async () => {
      chainableFindOne({ issueKey: 'PROJ-7', ...VALID_RESPONSE, scoredAt: new Date() });
      const result = await service.getCached('PROJ-7');
      expect(result).toEqual(VALID_RESPONSE);
    });

    it('throws ServiceUnavailableException when project_id is missing from SA JSON', async () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ client_email: 'svc@proj.iam.gserviceaccount.com' }),
      );
      const module = await Test.createTestingModule({
        providers: [
          TicketScoreService,
          { provide: getModelToken(TicketScoreDoc.name), useValue: mockScoreModel },
        ],
      }).compile();
      const freshService = module.get<TicketScoreService>(TicketScoreService);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/valid/sa.json';
      mockExistsSync.mockReturnValue(true);
      await expect(freshService.scoreTicket('PROJ-8', 'Summary', 'Desc')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('strips markdown code fences from Gemini response', async () => {
      const fenced = `\`\`\`json\n${JSON.stringify(VALID_RESPONSE)}\n\`\`\``;
      mockGenerateContent.mockResolvedValue({ text: fenced });
      const result = await service.scoreTicket('PROJ-9', 'Summary', 'Desc');
      expect(result).toEqual(VALID_RESPONSE);
    });
  });

  describe('scoreByUrl()', () => {
    const TEST_URL = 'https://github.com/expressjs/express/issues/7350';
    const HTML = `<html><head><title>Fix bug</title></head><body><p>This is the issue body.</p></body></html>`;
    const PUBLIC_IP = [{ address: '140.82.114.4', family: 4 }];

    beforeEach(() => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/valid/sa.json';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ project_id: 'test-project' }));
      chainableFindOne(null);
      mockScoreModel.create.mockResolvedValue({});
      mockLookup.mockResolvedValue(PUBLIC_IP);
    });

    afterEach(() => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      jest.restoreAllMocks();
    });

    // ── URL validation (assertSafeUrl) ──────────────────────────────────────

    it('throws UnprocessableEntityException for non-https scheme (http)', async () => {
      await expect(
        service.scoreByUrl('http://github.com/expressjs/express/issues/7350'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException for file:// scheme', async () => {
      await expect(service.scoreByUrl('file:///etc/passwd')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when hostname resolves to private IPv4', async () => {
      mockLookup.mockResolvedValue([{ address: '192.168.1.1', family: 4 }]);
      await expect(service.scoreByUrl('https://internal.example.com/')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when hostname resolves to loopback', async () => {
      mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      await expect(service.scoreByUrl('https://localhost/')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when hostname resolves to link-local (cloud metadata)', async () => {
      mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
      await expect(service.scoreByUrl('https://metadata.aws.internal/')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException for direct private IP in URL', async () => {
      await expect(service.scoreByUrl('https://192.168.1.1/')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException for direct loopback IP in URL', async () => {
      await expect(service.scoreByUrl('https://127.0.0.1/')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when DNS lookup fails', async () => {
      mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(service.scoreByUrl('https://notareal.domain/')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    // ── Fetch / Gemini happy path ────────────────────────────────────────────

    it('returns cached result without calling fetch or Gemini', async () => {
      chainableFindOne({ issueKey: `url:${TEST_URL}`, ...VALID_RESPONSE, scoredAt: new Date() });
      const fetchSpy = jest.spyOn(global, 'fetch');

      const result = await service.scoreByUrl(TEST_URL);
      expect(result).toEqual(VALID_RESPONSE);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('fetches URL, scores via Gemini, and caches with url: prefix', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(HTML, { status: 200, headers: { 'content-type': 'text/html' } }),
        );
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.scoreByUrl(TEST_URL);
      expect(result).toEqual(VALID_RESPONSE);
      expect(mockScoreModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ issueKey: `url:${TEST_URL}`, overall: 72 }),
      );
    });

    it('throws UnprocessableEntityException when fetch fails (network error)', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      await expect(service.scoreByUrl(TEST_URL)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when URL returns non-2xx', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }));
      await expect(service.scoreByUrl(TEST_URL)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when content-type is not HTML', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response('binary', { status: 200, headers: { 'content-type': 'application/pdf' } }),
        );
      await expect(service.scoreByUrl(TEST_URL)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ServiceUnavailableException when Gemini fails', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(HTML, { status: 200, headers: { 'content-type': 'text/html' } }),
        );
      mockGenerateContent.mockRejectedValue(new Error('Gemini down'));
      await expect(service.scoreByUrl(TEST_URL)).rejects.toThrow(ServiceUnavailableException);
    });

    it('clearCacheByUrl deletes with url: prefix key', async () => {
      chainableDeleteOne();
      await service.clearCacheByUrl(TEST_URL);
      expect(mockScoreModel.deleteOne).toHaveBeenCalledWith({ issueKey: `url:${TEST_URL}` });
    });
  });
});
