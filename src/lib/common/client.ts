import https from 'node:https';
import { HttpMethod } from '@activepieces/pieces-common';
import catalog from './catalog.json';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, name: string, maximum = 256): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) {
    throw new Error(`${name} must be nonempty text (maximum ${maximum} characters).`);
  }
  return value;
}

function token(auth: unknown): string {
  const value = record(auth) ? auth['secret_text'] : auth;
  const key = text(value, 'API key', 512);
  if (!/^sk-popnow-\S+$/.test(key)) throw new Error('Enter a PopNow API key from the API console.');
  return key;
}

function input(value: unknown): Record<string, unknown> {
  let parsed: unknown;
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (!raw || raw.length > 2_000_000) throw new Error();
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Model input must be a finite JSON object, at most 2 MB.');
  }
  if (!record(parsed) || hasNonFinite(parsed) || hasNonFinite(value)) throw new Error('Model input must be a finite JSON object.');
  return parsed;
}

function hasNonFinite(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasNonFinite);
  if (record(value)) return Object.values(value).some(hasNonFinite);
  return false;
}

function approvedAmount(value: unknown): string {
  if (typeof value !== 'string' || value.length > 40 || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,9})?$/.test(value)) {
    throw new Error('Approved maximum USD must be an exact nonnegative decimal string, with up to nine decimal places.');
  }
  return value;
}

function idempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[\x21-\x7e]{1,100}$/.test(value)) {
    throw new Error('Idempotency key must contain 1–100 visible ASCII characters. Keep the same key when retrying the same task.');
  }
  return value;
}

function mediaModel(value: unknown): string {
  const model = text(value, 'Model');
  if (!catalog.models.includes(model)) throw new Error('Choose a supported public media model from List Models.');
  return model;
}

function safeUrl(value: unknown): string {
  const path = text(value, 'API path', 1000);
  if (!/^\/[a-zA-Z0-9]/.test(path) || path.includes('\\')) throw new Error('Use a relative PopNow API path, such as /models.');
  const url = new URL(BASE_URL + path);
  if (url.origin !== 'https://api.popnow.ai' || !url.pathname.startsWith('/api/v1/') || url.pathname.includes('%')) throw new Error('Only unencoded PopNow API paths are allowed.');
  return url.toString();
}

async function request({ auth, path, method = HttpMethod.GET, body, queryParams, headers = {} }: RequestOptions): Promise<Record<string, unknown>> {
  const key = token(auth);
  const url = safeUrl(path);
  let result: unknown;
  try {
    const response = await popnowTransport.send({
      url, method, body, queryParams,
      headers: { ...headers, Authorization: `Bearer ${key}`, Accept: 'application/json', 'User-Agent': 'PopNow-Activepieces/0.1.0' },
    });
    if (response.status < 200 || response.status > 299) throw new Error();
    result = response.body;
  } catch {
    throw new Error('PopNow request failed. Check the connection, permissions, input and API USD balance. A timed-out task may still exist; check its status or retry with the SAME idempotency key.');
  }
  if (!record(result) || result['code'] !== 200 || !record(result['data'])) {
    throw new Error('PopNow rejected the request or returned an unexpected response. Check parameters and obtain a fresh quote if needed.');
  }
  return result['data'];
}

async function send({ url, method, body, queryParams, headers }: TransportOptions): Promise<{ status: number; body: unknown }> {
  const target = new URL(url);
  for (const [name, value] of Object.entries(queryParams ?? {})) target.searchParams.set(name, value);
  const payload = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = https.request(target, {
      method, rejectUnauthorized: true, timeout: 60000,
      headers: { ...headers, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) },
    }, res => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 8_000_000) { res.destroy(); reject(new Error('Response too large')); return; }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.end(payload);
  });
}

async function models({ auth, search, modality }: { auth: unknown; search?: string; modality?: string }): Promise<Record<string, unknown>[]> {
  const data = await request({ auth, path: '/models', queryParams: { includeSchema: '1', includeExamples: '1', ...(search ? { search } : {}), ...(modality ? { modality } : {}) } });
  if (!Array.isArray(data['items'])) throw new Error('PopNow returned an invalid model list.');
  return data['items'].filter(record).filter(m => typeof m['model'] === 'string' && catalog.models.includes(m['model']));
}

async function quote({ auth, model, modelInput }: GenerationOptions): Promise<Record<string, unknown>> {
  return request({ auth, path: '/jobs/quote', method: HttpMethod.POST, body: { model: mediaModel(model), input: input(modelInput) } });
}

async function create({ auth, model, modelInput, quoteId, maximumUsd, key }: GenerationOptions & { quoteId: unknown; maximumUsd: unknown; key: unknown }): Promise<Record<string, unknown>> {
  const body = { model: mediaModel(model), input: input(modelInput), quoteId: text(quoteId, 'Quote ID'), expectedCostUsd: approvedAmount(maximumUsd) };
  return request({ auth, path: '/jobs/createTask', method: HttpMethod.POST, body, headers: { 'Idempotency-Key': idempotencyKey(key) } });
}

export const popnowClient = { record, text, token, input, approvedAmount, idempotencyKey, mediaModel, safeUrl, request, models, quote, create };
export const popnowTransport = { send };
export const BASE_URL = 'https://api.popnow.ai/api/v1';

type GenerationOptions = { auth: unknown; model: unknown; modelInput: unknown };
type RequestOptions = { auth: unknown; path: string; method?: HttpMethod; body?: Record<string, unknown>; queryParams?: Record<string, string>; headers?: Record<string, string> };
type TransportOptions = Omit<RequestOptions, 'auth' | 'path'> & { url: string; method: HttpMethod; headers: Record<string, string> };
