import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpMethod } from '@activepieces/pieces-common';
import { popnowClient, popnowTransport } from '../src/lib/common/client';
import { popnow } from '../src';

afterEach(() => mock.restoreAll());

const auth = 'sk-popnow-test-only';
const model = 'alibaba/qwen-image-2/text-to-image';
const modelInput = { prompt: 'A lighthouse', image_url: 'https://example.org/reference.png' };

test('loads a native piece with five guided actions and a custom call', () => {
  assert.deepEqual(Object.keys(popnow.actions()).sort(), ['list_models', 'get_balance', 'quote_generation', 'create_generation', 'get_generation', 'custom_api_call'].sort());
  assert.equal(popnow.getAction('create_generation')?.aiMetadata?.idempotent, true);
  assert.equal(popnow.getAction('custom_api_call')?.audience, 'human');
});

test('preserves exact nine-decimal approved USD and stable retry key', async () => {
  const sent: Parameters<typeof popnowTransport.send>[0][] = [];
  mock.method(popnowTransport, 'send', async (r: Parameters<typeof popnowTransport.send>[0]) => {
    sent.push(r);
    return { status: 202, body: { code: 200, data: { taskId: 'task_same', state: 'queued' } } };
  });
  const args = { auth, model, modelInput, quoteId: 'q_test', maximumUsd: '0.000000001', key: 'workflow-item-1' };
  await popnowClient.create(args);
  await popnowClient.create(args);
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(sent[0].body?.['expectedCostUsd'], '0.000000001');
  assert.equal(sent[0].headers['Idempotency-Key'], 'workflow-item-1');
  assert.equal(sent[0].url, 'https://api.popnow.ai/api/v1/jobs/createTask');
  assert.deepEqual(sent[0].body?.['input'], modelInput);
});

test('rejects missing approval or malformed retry keys before network access', async () => {
  const spy = mock.method(popnowTransport, 'send');
  for (const maximumUsd of [undefined, 0.01, '-1', '1e-3', 'NaN', '01', '0.0000000001']) {
    await assert.rejects(popnowClient.create({ auth, model, modelInput, quoteId: 'q', maximumUsd, key: 'stable' }));
  }
  for (const key of ['', 'has space', 'line\r\ninjection', 'x'.repeat(101)]) {
    await assert.rejects(popnowClient.create({ auth, model, modelInput, quoteId: 'q', maximumUsd: '0.01', key }));
  }
  await assert.rejects(popnowClient.create({ auth, model, modelInput, quoteId: '', maximumUsd: '0.01', key: 'k' }));
  assert.equal(spy.mock.callCount(), 0);
});

test('requires a finite JSON object, including exponent overflow', () => {
  for (const value of ['[]', 'true', '{bad}', '{"x":1e400}', { x: Infinity }, { x: NaN }, null]) assert.throws(() => popnowClient.input(value));
  const cycle: Record<string, unknown> = {};
  cycle['self'] = cycle;
  assert.throws(() => popnowClient.input(cycle));
  assert.deepEqual(popnowClient.input(JSON.stringify(modelInput)), modelInput);
});

test('quote sends the exact model input and no paid creation request', async () => {
  const spy = mock.method(popnowTransport, 'send', async () => ({ status: 200, body: { code: 200, data: { quoteId: 'q', maxChargeUsd: '0.025' } } }));
  const quote = await popnowClient.quote({ auth, model, modelInput });
  assert.equal(quote['maxChargeUsd'], '0.025');
  assert.equal(spy.mock.calls[0].arguments[0].url, 'https://api.popnow.ai/api/v1/jobs/quote');
  assert.deepEqual(spy.mock.calls[0].arguments[0].body, { model, input: modelInput });
});

test('accepts old and new framework connection shapes, rejects header injection', () => {
  assert.equal(popnowClient.token(auth), auth);
  assert.equal(popnowClient.token({ secret_text: auth }), auth);
  for (const value of ['other-key', 'sk-popnow-key\r\nHeader:x', null]) assert.throws(() => popnowClient.token(value));
});

test('never accepts an arbitrary or encoded target host/path', () => {
  for (const path of ['https://evil.invalid', '//evil.invalid', '/../../admin', '/jobs/../../../../evil', '/%2e%2e/admin', '/jobs/%63reateTask', '/\\evil']) assert.throws(() => popnowClient.safeUrl(path));
  assert.equal(popnowClient.safeUrl('/models/vendor/model.1/task'), 'https://api.popnow.ai/api/v1/models/vendor/model.1/task');
});

test('read-only operations use documented endpoint and query names', async () => {
  const spy = mock.method(popnowTransport, 'send', async () => ({ status: 200, body: { code: 200, data: { items: [{ model, available: true }] } } }));
  assert.equal((await popnowClient.models({ auth, search: 'image & video', modality: 'image' })).length, 1);
  assert.deepEqual(spy.mock.calls[0].arguments[0].queryParams, { includeSchema: '1', includeExamples: '1', search: 'image & video', modality: 'image' });
  assert.equal(spy.mock.calls[0].arguments[0].method, HttpMethod.GET);
});

test('HTTP failures and upstream bodies cannot leak keys through user errors', async () => {
  mock.method(popnowTransport, 'send', async () => { throw new Error(`sensitive ${auth} request body`); });
  await assert.rejects(popnowClient.request({ auth, path: '/chat/credit' }), error => error instanceof Error && !error.message.includes(auth) && error.message.includes('SAME idempotency key'));
});

test('rejects redirects, API error envelopes and malformed success responses', async () => {
  for (const response of [{ status: 302, body: {} }, { status: 200, body: { code: 403, msg: auth } }, { status: 200, body: { code: 200, data: [] } }]) {
    mock.restoreAll();
    mock.method(popnowTransport, 'send', async () => response);
    await assert.rejects(popnowClient.request({ auth, path: '/chat/credit' }), error => error instanceof Error && !error.message.includes(auth));
  }
});
