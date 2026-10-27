import { Property } from '@activepieces/pieces-framework';
import { popnowAuth } from '../auth';
import { popnowClient } from './client';

export const popnowProps = {
  model: Property.Dropdown({
    auth: popnowAuth, displayName: 'Model', required: true, refreshers: [],
    options: async ({ auth }) => {
      if (!auth) return { disabled: true, options: [], placeholder: 'Connect PopNow first' };
      try {
        const models = await popnowClient.models({ auth });
        return { disabled: false, options: models.filter(m => m['available'] !== false && typeof m['model'] === 'string').map(m => ({ label: String(m['displayName'] || m['model']), value: String(m['model']) })) };
      } catch {
        return { disabled: true, options: [], placeholder: 'Could not load models. Check the connection.' };
      }
    },
  }),
  modelInput: Property.Json({ displayName: 'Model input', required: true, description: 'Map a JSON object matching the selected model inputSchema from List Models. For a text-to-image model, start with {"prompt":"A lighthouse at sunrise"}. Keep this exact object unchanged between Quote Generation and Create Generation.' }),
};
