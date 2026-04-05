import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { MetaService } from './meta.service';

describe('MetaService', () => {
  let service: MetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetaService],
    }).compile();

    service = module.get<MetaService>(MetaService);
  });

  describe('fetchTitle', () => {
    it('returns null title for non-http/https URLs', async () => {
      const result = await service.fetchTitle('ftp://example.com');
      expect(result).toEqual({ url: 'ftp://example.com', title: null });
    });

    it('returns null title when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it('returns null title when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        headers: { get: () => 'text/html' },
        body: null,
      });
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it('returns null title when content-type is not text/html', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        body: null,
      });
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it('extracts and decodes HTML entities from title tag', async () => {
      const html = '<html><head><title>Hello &amp; World &lt;Test&gt;</title></head></html>';
      const encoder = new TextEncoder();
      const chunk = encoder.encode(html);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: (h: string) => (h === 'content-type' ? 'text/html' : null) },
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: chunk })
              .mockResolvedValue({ done: true, value: undefined }),
            cancel: jest.fn(),
          }),
        },
      });

      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBe('Hello & World <Test>');
    });
  });
});
