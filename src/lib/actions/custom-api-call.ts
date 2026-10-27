import { createCustomApiCallAction, HttpMethod } from '@activepieces/pieces-common';
import { popnowAuth } from '../auth';
import { BASE_URL, popnowClient } from '../common/client';

const base = createCustomApiCallAction({
  auth: popnowAuth, baseUrl: () => BASE_URL,
  authMapping: async auth => ({ Authorization: `Bearer ${popnowClient.token(auth)}` }),
  description: 'Call a relative PopNow API path. Redirects are disabled. Paid task creation requires quoteId, expectedCostUsd and an Idempotency-Key header. Quote and approve costs first.',
  props: { url: { description: 'Relative path only, such as /models. Your API key is never sent to another host.', defaultValue: '/models' } },
});

async function run(context: Parameters<typeof base.run>[0]): Promise<unknown> {
  const p = context.propsValue;
  const path = popnowClient.text(p.url['url'], 'API path', 1000);
  const target = popnowClient.safeUrl(path);
  const method = p.method ?? HttpMethod.GET;
  const body = p.body_type && p.body_type !== 'none' ? popnowClient.input(p.body?.['data']) : undefined;
  const headers = Object.fromEntries(Object.entries(p.headers ?? {}).map(([k, v]) => [k, String(v)]));
  if (Object.keys(headers).some(k => /^(authorization|host|cookie|proxy-authorization|content-length)$/i.test(k) || !/^[\w-]+$/.test(k)) || Object.values(headers).some(v => /[\r\n]/.test(v))) throw new Error('Use only non-authentication custom headers without line breaks.');
  const pathname = new URL(target).pathname;
  if (pathname.startsWith('/api/v1/models/')) popnowClient.mediaModel(pathname.slice('/api/v1/models/'.length));
  if (method === HttpMethod.POST && ['/api/v1/jobs/quote', '/api/v1/jobs/createTask'].includes(pathname)) popnowClient.mediaModel(body?.['model']);
  if (method === HttpMethod.POST && pathname === '/api/v1/jobs/createTask') {
    if (!body) throw new Error('Provide the quoted task body.');
    popnowClient.text(body['quoteId'], 'Quote ID');
    popnowClient.approvedAmount(body['expectedCostUsd']);
    const key = Object.entries(headers).find(([name]) => name.toLowerCase() === 'idempotency-key')?.[1];
    popnowClient.idempotencyKey(key);
  }
  const data = await popnowClient.request({ auth: context.auth, path, method, body, headers, queryParams: Object.fromEntries(Object.entries(p.queryParams ?? {}).map(([k, v]) => [k, String(v)])) });
  if (pathname === '/api/v1/models' && Array.isArray(data['items'])) return { ...data, items: data['items'].filter(popnowClient.record).filter(m => { try { popnowClient.mediaModel(m['model']); return true; } catch { return false; } }) };
  return data;
}

export const customApiCall = Object.assign(base, { run, classification: 'WRITE', audience: 'human', aiMetadata: { description: 'Advanced relative-path call to the PopNow API. This can mutate data or spend API funds; prefer the guided quote and creation actions.', idempotent: false } });
