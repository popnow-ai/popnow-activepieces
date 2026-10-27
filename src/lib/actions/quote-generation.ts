import { createAction } from '@activepieces/pieces-framework';
import { popnowAuth } from '../auth';
import { popnowClient } from '../common/client';
import { popnowProps } from '../common/props';

export const quoteGeneration = Object.assign(createAction({
  auth: popnowAuth, name: 'quote_generation', displayName: 'Quote Generation',
  description: 'Get an exact USD quote without creating a task or holding funds.',
  audience: 'both', aiMetadata: { description: 'Price the exact model and input before seeking budget approval. Quotes expire after five minutes; this operation never creates a media task.', idempotent: false },
  props: { model: popnowProps.model, model_input: popnowProps.modelInput },
  async run(context) {
    const data = await popnowClient.quote({ auth: context.auth, model: context.propsValue.model, modelInput: context.propsValue.model_input });
    return { quote_id: data['quoteId'], model: data['model'], expected_charge_usd: data['expectedChargeUsd'], max_charge_usd: data['maxChargeUsd'], currency: data['currency'], expires_at: data['expiresAt'] };
  },
}), { classification: 'WRITE' });
