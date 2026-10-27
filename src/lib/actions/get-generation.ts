import { createAction, Property } from '@activepieces/pieces-framework';
import { popnowAuth } from '../auth';
import { popnowClient } from '../common/client';

export const getGeneration = Object.assign(createAction({
  auth: popnowAuth, name: 'get_generation', displayName: 'Get Generation',
  description: 'Read task status, final cost and signed output asset URLs.',
  audience: 'both', aiMetadata: { description: 'Check a known task after Create Generation, including after a timeout. Only succeeded means usable output; queued and running are unfinished. Signed asset URLs expire and must be treated as private bearer links.', idempotent: true },
  props: { task_id: Property.ShortText({ displayName: 'Task ID', required: true, description: 'Map task_id from Create Generation.' }) },
  async run(context) {
    const data = await popnowClient.request({ auth: context.auth, path: '/jobs/recordInfo', queryParams: { taskId: popnowClient.text(context.propsValue.task_id, 'Task ID') } });
    const output = popnowClient.record(data['output']) ? data['output'] : {};
    return { task_id: data['taskId'], model: data['model'], state: data['state'], succeeded: data['state'] === 'succeeded', cost_usd: data['costUsd'], settled: data['settled'], error_code: data['errorCode'], error_message: data['errorMessage'], assets: output['assets'] ?? [], output_json: JSON.stringify(output) };
  },
}), { classification: 'READ' });
