import { getLocalDataSnapshot, importLocalDataSnapshot, clearCurrentUserState, setCurrentUserState } from '../store/userStore.js';
import { AUTH_TOKEN_KEY, getApiBaseUrl, readRaw, removeRaw, writeRaw } from './storageService.js';

export const TOKEN_KEY = AUTH_TOKEN_KEY;
export const USER_KEY = 'compcheck:auth-user';

export const AUTH_ERROR_MESSAGES = {
  invalidEmail: '请输入有效的邮箱地址',
  shortPassword: '密码至少需要 8 个字符',
  emailRegistered: '该邮箱已被注册，请直接登录',
  invalidCredentials: '邮箱或密码错误，请重试',
  server: '服务器异常，请稍后再试',
  network: '网络连接失败，请检查网络'
};

export async function login(email, password) {
  return authenticate('login', email, password);
}

export async function register(email, password) {
  return authenticate('register', email, password);
}

export async function logout() {
  const token = getToken({ redirectOnExpire: false });
  try {
    if (token && typeof fetch === 'function') {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
    }
  } catch {
    // Local logout must still complete when the network is unavailable.
  } finally {
    clearAuthState();
  }

  return { ok: true };
}

export function getToken(options = {}) {
  const token = String(readRaw(TOKEN_KEY) || '').trim();
  if (!token) return '';
  if (!isUsableJwt(token)) {
    clearAuthState();
    if (options.redirectOnExpire !== false) redirectToLogin();
    return '';
  }
  return token;
}

export function getCurrentUser() {
  if (!getToken()) return null;
  const user = parseStoredUser(readRaw(USER_KEY));
  return setCurrentUserState(user);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export async function syncLocalDataToServer(snapshot = getLocalDataSnapshot()) {
  if (!getToken({ redirectOnExpire: false })) {
    return { ok: false, reason: 'anonymous', summary: null };
  }

  const result = importLocalDataSnapshot(snapshot);
  await Promise.resolve();
  return {
    ok: result.ok === true,
    reason: result.ok ? 'queued' : 'invalid_snapshot',
    summary: result.summary || null
  };
}

export function validateAuthInput(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!isEmailAddress(normalizedEmail)) {
    return {
      ok: false,
      field: 'email',
      message: AUTH_ERROR_MESSAGES.invalidEmail
    };
  }

  if (String(password || '').length < 8) {
    return {
      ok: false,
      field: 'password',
      message: AUTH_ERROR_MESSAGES.shortPassword
    };
  }

  return {
    ok: true,
    value: {
      email: normalizedEmail,
      password: String(password)
    }
  };
}

export function normalizeAuthMode(value) {
  return value === 'register' ? 'register' : 'login';
}

export function buildAuthRedirectTarget(value, category = 'food') {
  const normalized = String(value || '').trim();
  const fallback = `/${category || 'food'}`;
  if (!normalized || !normalized.startsWith('/')) return fallback;
  if (normalized === '/login' || normalized.endsWith('/login')) return fallback;
  return normalized;
}

async function authenticate(mode, email, password) {
  const authMode = normalizeAuthMode(mode);
  const validation = validateAuthInput(email, password);
  if (!validation.ok) {
    throw createAuthError('validation', validation.message, {
      field: validation.field
    });
  }

  const snapshot = getLocalDataSnapshot();
  const response = await requestAuthJson(`/auth/${authMode}`, {
    method: 'POST',
    body: JSON.stringify(validation.value)
  });

  const user = saveAuthSession(response);
  const sync = await syncLocalDataToServer(snapshot);
  return {
    token: response.token,
    tokenType: response.tokenType || 'Bearer',
    expiresAt: response.expiresAt || '',
    user,
    sync
  };
}

async function requestAuthJson(path, options = {}) {
  if (typeof fetch !== 'function') {
    throw createAuthError('network', AUTH_ERROR_MESSAGES.network);
  }

  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  } catch {
    throw createAuthError('network', AUTH_ERROR_MESSAGES.network);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw mapAuthResponseError(response.status, body);
  }

  if (!body?.token || !body?.user) {
    throw createAuthError('server', AUTH_ERROR_MESSAGES.server, { status: response.status });
  }

  return body;
}

function mapAuthResponseError(status, body) {
  const errorCode = body?.error || '';
  if (status === 409 || errorCode === 'email_already_registered') {
    return createAuthError('email_registered', AUTH_ERROR_MESSAGES.emailRegistered, { status });
  }
  if (status === 401 || errorCode === 'invalid_credentials') {
    return createAuthError('invalid_credentials', AUTH_ERROR_MESSAGES.invalidCredentials, { status });
  }
  if (status === 400 && body?.field === 'email') {
    return createAuthError('validation', AUTH_ERROR_MESSAGES.invalidEmail, { status, field: 'email' });
  }
  if (status === 400 && body?.field === 'password') {
    return createAuthError('validation', AUTH_ERROR_MESSAGES.shortPassword, { status, field: 'password' });
  }
  return createAuthError('server', AUTH_ERROR_MESSAGES.server, { status });
}

function saveAuthSession(response) {
  writeRaw(TOKEN_KEY, response.token);
  const user = parseStoredUser(response.user);
  if (!user) {
    clearAuthState();
    throw createAuthError('server', AUTH_ERROR_MESSAGES.server);
  }
  writeRaw(USER_KEY, JSON.stringify(user));
  return setCurrentUserState(user);
}

function clearAuthState() {
  removeRaw(TOKEN_KEY);
  removeRaw(USER_KEY);
  clearCurrentUserState();
}

function parseStoredUser(value) {
  const input = typeof value === 'string' ? parseJson(value) : value;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const id = String(input.id || '').trim();
  const email = normalizeEmail(input.email);
  if (!id || !email) return null;
  return {
    id,
    email,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : ''
  };
}

function isUsableJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = parseJwtPayload(parts[1]);
  return Number.isFinite(payload?.exp) && payload.exp * 1000 > Date.now();
}

function parseJwtPayload(value) {
  try {
    return JSON.parse(decodeBase64Url(value));
  } catch {
    return null;
  }
}

function decodeBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  if (typeof atob === 'function') return atob(padded);
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64url').toString('utf8');
  return '';
}

function redirectToLogin() {
  if (typeof window === 'undefined' || !window.location) return;
  const currentHash = String(window.location.hash || '#/food');
  if (/^#\/(?:[^/]+\/)?login(?:\?|$)/.test(currentHash)) return;
  const redirect = currentHash.replace(/^#/, '') || '/food';
  window.location.hash = `#/login?redirect=${encodeURIComponent(redirect)}`;
}

function createAuthError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
