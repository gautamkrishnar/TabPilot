import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly TIMEOUT_MS = 6000;
  private readonly MAX_BYTES = 50_000; // only read first 50KB — title is always in <head>

  async fetchTitle(url: string): Promise<{ url: string; title: string | null }> {
    try {
      // Validate URL is http/https
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { url, title: null };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(url, {
          signal: controller.signal,
          headers: {
            // Appear as a browser so pages don't block bot requests
            'User-Agent': 'Mozilla/5.0 (compatible; Tab Pilot/1.0)',
            Accept: 'text/html',
          },
          redirect: 'follow',
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) {
        return { url, title: null };
      }

      // Stream only the first MAX_BYTES to avoid downloading full pages
      const reader = res.body?.getReader();
      if (!reader) return { url, title: null };

      let html = '';
      let bytesRead = 0;
      const decoder = new TextDecoder();

      while (bytesRead < this.MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.byteLength;
        // Stop early once we've passed </head>
        if (html.includes('</head>')) break;
      }
      reader.cancel();

      const title = this.extractTitle(html);
      return { url, title };
    } catch (err) {
      this.logger.warn(`fetchTitle failed for ${url}: ${err}`);
      return { url, title: null };
    }
  }

  private extractTitle(html: string): string | null {
    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (!match) return null;
    return (
      match[1]
        .trim()
        .replaceAll(/\s+/g, ' ') // collapse whitespace
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&nbsp;', ' ') || null
    );
  }
}
