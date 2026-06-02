import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
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

import * as nodeFs from 'node:fs';

const mockExistsSync = nodeFs.existsSync as jest.Mock;
const mockReadFileSync = nodeFs.readFileSync as jest.Mock;

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

describe('TicketScoreService', () => {
  let service: TicketScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketScoreService],
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
    });

    afterEach(() => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.VERTEX_AI_LOCATION;
    });

    it('throws ServiceUnavailableException when credentials are not set', async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const module = await Test.createTestingModule({
        providers: [TicketScoreService],
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

    it('uses custom VERTEX_AI_LOCATION when set', async () => {
      process.env.VERTEX_AI_LOCATION = 'europe-west1';
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      const module = await Test.createTestingModule({
        providers: [TicketScoreService],
      }).compile();
      const freshService = module.get<TicketScoreService>(TicketScoreService);

      const result = await freshService.scoreTicket('PROJ-1', 'Summary', 'Description');
      expect(result).toEqual(VALID_RESPONSE);
    });

    it('handles description being empty', async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.scoreTicket('PROJ-4', 'Summary only', '');
      expect(result).toEqual(VALID_RESPONSE);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents).toContain('(no description provided)');
    });

    it('returns cached result on second call without calling Gemini again', async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      await service.scoreTicket('PROJ-5', 'Summary', 'Description');
      const result = await service.scoreTicket('PROJ-5', 'Summary', 'Description');
      expect(result).toEqual(VALID_RESPONSE);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('calls Gemini again after cache is cleared', async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(VALID_RESPONSE) });

      await service.scoreTicket('PROJ-6', 'Summary', 'Description');
      service.clearCache('PROJ-6');
      await service.scoreTicket('PROJ-6', 'Summary', 'Description');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('getCached returns undefined for uncached keys', () => {
      expect(service.getCached('NONEXISTENT-1')).toBeUndefined();
    });
  });
});
