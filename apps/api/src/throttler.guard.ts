import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  private readonly trustProxy: boolean = process.env.ALLOW_PROXY === 'true';

  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (this.trustProxy) {
      const forwarded = req.headers['x-forwarded-for'];
      const realIp = req.headers['x-real-ip'];
      if (forwarded) return (forwarded as string).split(',')[0].trim();
      if (realIp) return realIp as string;
    }
    return req.ip;
  }
}
