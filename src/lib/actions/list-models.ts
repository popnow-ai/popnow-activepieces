import { createAction, Property } from '@activepieces/pieces-framework';
import { popnowAuth } from '../auth';
import { popnowClient } from '../common/client';

export const listModels = Object.assign(createAction({
  auth: popnowAuth, name: 'list_models', displayName: 'List Models',
  description: 'Find available image, video and audio models with input schemas and examples.',
  audience: 'both', aiMetadata: { description: 'Discover model IDs and required inputs before quoting a generation. This read does not create or charge for a task.', idempotent: true },
  props: {
    search: Property.ShortText({ displayName: 'Search', required: false, description: 'Filter models by name or task, such as text-to-image.' }),
    modality: Property.StaticDropdown({ displayName: 'Media type', required: false, options: { options: [{ label: 'Image', value: 'image' }, { label: 'Video', value: 'video' }, { label: 'Audio', value: 'audio' }] } }),
  },
  async run(context) {
    const models = await popnowClient.models({ auth: context.auth, search: context.propsValue.search, modality: context.propsValue.modality });
    return models.map(m => ({ model: m['model'], display_name: m['displayName'], provider: m['provider'], modality: m['modality'], available: m['available'], input_schema_json: JSON.stringify(m['inputSchema'] ?? {}), examples_json: JSON.stringify(m['examples'] ?? []) }));
  },
}), { classification: 'SEARCH' });
