import { env } from 'cloudflare:workers';

type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type SecurityEnvironment = {
  REGISTRATION_RATE_LIMITER?: RateLimiter;
};

export function requestIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function rateLimit(request: Request, purpose: string) {
  const limiter = (env as unknown as SecurityEnvironment)
    .REGISTRATION_RATE_LIMITER;
  if (!limiter) {
    const hostname = new URL(request.url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  const result = await limiter.limit({
    key: `${purpose}:${requestIp(request)}`,
  });
  return result.success;
}

export function hasSameOrigin(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function safeText(value: unknown, maxLength = 300) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function validCalendarDate(value: string, required = false) {
  if (!value) return !required;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validTelegramUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 't.me' || url.hostname === 'telegram.me') &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}
