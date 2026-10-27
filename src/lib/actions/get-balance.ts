import { createAction } from '@activepieces/pieces-framework';
import { popnowAuth } from '../auth';
import { popnowClient } from '../common/client';

export const getBalance = Object.assign(createAction({
  auth: popnowAuth, name: 'get_balance', displayName: 'Get API Balance',
  description: 'Read the separate API USD balance, including held funds.',
  audience: 'both', aiMetadata: { description: 'Check API dollars before generation. Website credits are separate; this read is safe to retry.', idempotent: true },
  props: {},
  async run(context) {
    const data = await popnowClient.request({ auth: context.auth, path: '/chat/credit' });
    return { available_usd: data['availableUsd'], held_usd: data['heldUsd'], total_usd: data['totalUsd'], currency: 'USD' };
  },
}), { classification: 'READ' });
