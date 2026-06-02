import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
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
  });
});
