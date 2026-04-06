import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as net from 'net';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly TIMEOUT_MS = 6000;
  private readonly MAX_BYTES = 50_000; // only read first 50KB — title is always in <head>

  async fetchTitle(url: string): Promise<{ url: string; title: string | null }> {
    try {
      // Validate URL is http/https and not pointing at a private/loopback address.
      // This prevents SSRF where an attacker supplies an internal URL.
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { url, title: null };
      }
      if (await this.isPrivateAddress(parsed.hostname)) {
        return { url, title: null };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      let res: Response;
      try {
        // Use parsed.href (the normalised, validated URL) rather than the raw
        // input string so static analysis can confirm the URL has been sanitised.
        res = await fetch(parsed.href, {
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

      // Re-validate the final URL after redirects to prevent redirect-based SSRF.
      try {
        const finalUrl = new URL(res.url);
        if (await this.isPrivateAddress(finalUrl.hostname)) {
          return { url, title: null };
        }
      } catch {
        // If the final URL cannot be parsed, treat it as unsafe.
        return { url, title: null };
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

  /** Block requests to loopback, link-local, and RFC-1918/IPv6-ULA private ranges. */
  private async isPrivateAddress(hostname: string): Promise<boolean> {
    // Treat bare localhost-style names as private without DNS.
    if (hostname === 'localhost') return true;
    if (hostname === '::1' || hostname === '[::1]') return true;

    // Strip IPv6 brackets if present.
    const host = hostname.replace(/^\[|\]$/g, '');

    // If it's already a literal IP, check ranges directly.
    const ipVersion = net.isIP(host);
    if (ipVersion === 4 || ipVersion === 6) {
      return this.isPrivateIp(host);
    }

    // Resolve hostname to an IP and check that.
    try {
      const { address } = await dns.promises.lookup(host, { family: 0 });
      return this.isPrivateIp(address);
    } catch {
      // If resolution fails, we conservatively treat it as non-private here;
      // the subsequent fetch will fail if the host is unreachable.
      return false;
    }
  }

  /** Check whether a literal IP (IPv4 or IPv6) is in a private or loopback range. */
  private isPrivateIp(ip: string): boolean {
    const version = net.isIP(ip);
    if (version === 4) {
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
      const [a, b] = parts;
      return (
        a === 10 || // 10.0.0.0/8
        a === 127 || // 127.0.0.0/8 loopback
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) || // 192.168.0.0/16
        (a === 169 && b === 254) // 169.254.0.0/16 link-local
      );
    }

    if (version === 6) {
      // Normalize to lowercase for prefix checks.
      const normalized = ip.toLowerCase();
      // Loopback ::1/128
      if (normalized === '::1') return true;
      // Unique local addresses fc00::/7
      if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
      // Link-local fe80::/10
      if (
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb')
      ) {
        return true;
      }
    }

    return false;
  }

  private extractTitle(html: string): string | null {
    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (!match) return null;
    // Decode common HTML entities in a single pass to avoid double-unescaping.
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };
    const decoded = match[1]
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/&(?:[a-z]+|#\d+);/gi, (e) => entities[e] ?? e);
    return decoded || null;
  }
}
