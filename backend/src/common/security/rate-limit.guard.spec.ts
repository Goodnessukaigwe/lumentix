import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function mockContext(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        socket: { remoteAddress: ip },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows requests within the limit', () => {
    const guard = new RateLimitGuard(3, 60_000);
    const ctx = mockContext('1.2.3.4');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('blocks requests exceeding the limit', () => {
    const guard = new RateLimitGuard(2, 60_000);
    const ctx = mockContext('5.6.7.8');

    guard.canActivate(ctx); // 1
    guard.canActivate(ctx); // 2

    expect(() => guard.canActivate(ctx)).toThrow(
      new HttpException(
        expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        }),
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('resets the count after the window expires', async () => {
    const guard = new RateLimitGuard(1, 50); // 50ms window
    const ctx = mockContext('9.10.11.12');

    guard.canActivate(ctx); // 1 — at limit

    await new Promise((r) => setTimeout(r, 60)); // wait for window to reset

    expect(guard.canActivate(ctx)).toBe(true); // fresh window
  });

  it('tracks IPs independently', () => {
    const guard = new RateLimitGuard(1, 60_000);

    const ctxA = mockContext('10.0.0.1');
    const ctxB = mockContext('10.0.0.2');

    guard.canActivate(ctxA); // A at limit

    // B should still be allowed
    expect(guard.canActivate(ctxB)).toBe(true);

    // A is now blocked
    expect(() => guard.canActivate(ctxA)).toThrow(HttpException);
  });

  it('respects x-forwarded-for header', () => {
    const guard = new RateLimitGuard(1, 60_000);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
          socket: { remoteAddress: '10.0.0.1' },
        }),
      }),
    } as unknown as ExecutionContext;

    guard.canActivate(ctx); // 1 — at limit
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });
});
