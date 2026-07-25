import 'reflect-metadata';
import * as dns from 'node:dns';
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

    it.each([
      ['localhost', 'http://localhost/secret'],
      ['IPv6 loopback', 'http://[::1]/secret'],
      ['RFC-1918 10.x.x.x', 'http://10.0.0.1/internal'],
      ['RFC-1918 192.168.x.x', 'http://192.168.1.1/router'],
      ['RFC-1918 172.16.x.x', 'http://172.16.0.1/internal'],
      ['link-local 169.254.x.x', 'http://169.254.169.254/metadata'],
    ])('blocks requests to %s', async (_label, url) => {
      const result = await service.fetchTitle(url);
      expect(result.title).toBeNull();
    });

    it('allows requests to public IPs', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await service.fetchTitle('https://8.8.8.8');
      expect(result.title).toBeNull(); // fails network, but not blocked
    });

    it.each([
      ['fetch fails', jest.fn().mockRejectedValue(new Error('Network error'))],
      [
        'response is not ok',
        jest.fn().mockResolvedValue({
          url: 'https://example.com',
          ok: false,
          headers: { get: () => 'text/html' },
          body: null,
        }),
      ],
      [
        'content-type is not text/html',
        jest.fn().mockResolvedValue({
          url: 'https://example.com',
          ok: true,
          headers: { get: () => 'application/json' },
          body: null,
        }),
      ],
    ])('returns null title when %s', async (_label, fetchMock) => {
      global.fetch = fetchMock;
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it('blocks post-redirect to a private address', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        url: 'http://192.168.1.1/internal', // redirect landed on private IP
        ok: true,
        headers: { get: () => 'text/html' },
        body: null,
      });
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it('blocks when post-redirect URL cannot be parsed', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        url: '', // empty string — new URL('') throws
        ok: true,
        headers: { get: () => 'text/html' },
        body: null,
      });
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it.each([
      ['IPv6 ULA fc00::/7', 'http://[fc00::1]/secret'],
      ['IPv6 ULA fd::/8', 'http://[fd12:3456:789a::1]/secret'],
      ['IPv6 link-local fe80::/10', 'http://[fe80::1]/secret'],
    ])('blocks %s', async (_label, url) => {
      const result = await service.fetchTitle(url);
      expect(result.title).toBeNull();
    });

    it('allows public IPv6 addresses', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      // 2001:db8:: is documentation range — public, not private
      const result = await service.fetchTitle('http://[2001:db8::1]/page');
      expect(result.title).toBeNull(); // fetch fails, but not blocked by SSRF guard
    });

    it('allows hostname when DNS lookup fails (fails open)', async () => {
      jest.spyOn(dns.promises, 'lookup').mockRejectedValueOnce(new Error('ENOTFOUND'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await service.fetchTitle('https://nonexistent.example.com');
      expect(result.title).toBeNull();
    });

    it('returns null when response body has no reader', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        url: 'https://example.com',
        ok: true,
        headers: { get: (h: string) => (h === 'content-type' ? 'text/html' : null) },
        body: null,
      });
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBeNull();
    });

    it('returns null when title tag is absent', async () => {
      const chunk = new TextEncoder().encode('<html><head></head><body>No title</body></html>');
      global.fetch = jest.fn().mockResolvedValue({
        url: 'https://example.com',
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
      expect(result.title).toBeNull();
    });

    it('stops reading early when </head> is found', async () => {
      const html = '<html><head><title>Early Stop</title></head><body>';
      const chunk = new TextEncoder().encode(html);
      const cancelMock = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({
        url: 'https://example.com',
        ok: true,
        headers: { get: (h: string) => (h === 'content-type' ? 'text/html' : null) },
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: chunk })
              .mockResolvedValue({ done: true, value: undefined }),
            cancel: cancelMock,
          }),
        },
      });
      const result = await service.fetchTitle('https://example.com');
      expect(result.title).toBe('Early Stop');
      expect(cancelMock).toHaveBeenCalled();
    });

    it('extracts and decodes HTML entities from title tag', async () => {
      const html = '<html><head><title>Hello &amp; World &lt;Test&gt;</title></head></html>';
      const encoder = new TextEncoder();
      const chunk = encoder.encode(html);

      global.fetch = jest.fn().mockResolvedValue({
        url: 'https://example.com',
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
