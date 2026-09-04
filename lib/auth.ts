import { env } from 'cloudflare:workers';
import { protectedHeadAdmins } from '@/lib/server-data';

type AuthEnvironment = {
  ADMIN_ACCESS_PASSWORD?: string;
  AUTH_SESSION_SECRET?: string;
};

type AdminSessionPayload = {
  kind: 'admin';
  email: string;
  expiresAt: number;
};

type DeviceSessionPayload = {
  kind: 'device';
  listenerId: string;
  group: string;
  expiresAt: number;
};

type SessionPayload = AdminSessionPayload | DeviceSessionPayload;

const adminCookieName = '__Host-mtv_etalimai_admin';
const deviceCookieName = '__Host-mtv_etalimai_device';
const encoder = new TextEncoder();

function authEnvironment() {
  return env as unknown as AuthEnvironment;
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return rawValue.join('=');
  }
  return '';
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const base64 = padded.padEnd(Math.ceil(padded.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey() {
  const secret = authEnvironment().AUTH_SESSION_SECRET;
  if (!secret) return null;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signedToken(payload: SessionPayload) {
  const key = await hmacKey();
  if (!key) throw new Error('AUTH_SESSION_SECRET is not configured');
  const encodedPayload = bytesToBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifiedToken(token: string) {
  const [encodedPayload, encodedSignature, ...extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra.length) return null;
  try {
    const key = await hmacKey();
    if (!key) return null;
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload)),
    ) as SessionPayload;
    if (!payload.expiresAt || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function passwordMatches(value: string) {
  const expected = authEnvironment().ADMIN_ACCESS_PASSWORD;
  if (!expected || !value) return false;
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(value)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const received = new Uint8Array(receivedHash);
  const stored = new Uint8Array(expectedHash);
  let mismatch = received.length ^ stored.length;
  for (let index = 0; index < stored.length; index += 1) {
    mismatch |= stored[index] ^ (received[index] ?? 0);
  }
  return mismatch === 0;
}

export async function adminFromCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = protectedHeadAdmins.find(
    (candidate) => candidate.email.toLowerCase() === normalizedEmail,
  );
  if (!admin || !(await passwordMatches(password))) return null;
  return admin;
}

export async function authenticatedAdmin(request: Request) {
  const payload = await verifiedToken(cookieValue(request, adminCookieName));
  if (!payload || payload.kind !== 'admin') return null;
  return (
    protectedHeadAdmins.find(
      (candidate) => candidate.email.toLowerCase() === payload.email,
    ) ?? null
  );
}

export async function deviceBinding(request: Request) {
  const payload = await verifiedToken(cookieValue(request, deviceCookieName));
  return payload?.kind === 'device' ? payload : null;
}

export async function adminSessionCookie(email: string) {
  const maxAge = 7 * 24 * 60 * 60;
  const token = await signedToken({
    kind: 'admin',
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + maxAge * 1000,
  });
  return `${adminCookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function deviceBindingCookie(listenerId: string, group: string) {
  const maxAge = 365 * 24 * 60 * 60;
  const token = await signedToken({
    kind: 'device',
    listenerId,
    group,
    expiresAt: Date.now() + maxAge * 1000,
  });
  return `${deviceCookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearAdminSessionCookie() {
  return `${adminCookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function clearDeviceBindingCookie() {
  return `${deviceCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
