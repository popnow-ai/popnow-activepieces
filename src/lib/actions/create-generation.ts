import { createAction, Property } from '@activepieces/pieces-framework';
import { popnowAuth } from '../auth';
import { popnowClient } from '../common/client';
import { popnowProps } from '../common/props';

export const createGeneration = Object.assign(createAction({
  auth: popnowAuth, name: 'create_generation', displayName: 'Create Generation',
  description: 'Start a paid media task using a fresh quote, an approved USD maximum and a stable retry key.',
  audience: 'both', aiMetadata: { description: 'Create a paid media task only after the quoted maximum USD amount is approved. Use the exact quoted model and input. Reuse the same idempotency key only for retries of this task; new tasks need new keys. Query Get Generation for completion.', idempotent: true },
  props: {
    model: popnowProps.model, model_input: popnowProps.modelInput,
    quote_id: Property.ShortText({ displayName: 'Quote ID', required: true, description: 'Map quote_id from Quote Generation. Obtain a new quote if it is more than five minutes old.' }),
    approved_max_usd: Property.ShortText({ displayName: 'Approved maximum USD', required: true, description: 'After budget approval, copy max_charge_usd from the quote as text, such as 0.025. This uses API funds. Do not round or use website credits.' }),
    idempotency_key: Property.ShortText({ displayName: 'Idempotency key', required: true, description: 'A unique key for each intended task (1–100 visible ASCII characters). Store and reuse it after a timeout to avoid duplicate charges.' }),
  },
  async run(context) {
    const p = context.propsValue;
    const data = await popnowClient.create({ auth: context.auth, model: p.model, modelInput: p.model_input, quoteId: p.quote_id, maximumUsd: p.approved_max_usd, key: p.idempotency_key });
    return { task_id: data['taskId'], model: data['model'], state: data['state'], estimated_cost_usd: data['estimatedCostUsd'], accepted: true };
  },
}), { classification: 'WRITE' });
