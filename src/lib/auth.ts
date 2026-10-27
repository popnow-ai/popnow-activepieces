import { PieceAuth } from '@activepieces/pieces-framework';
import { popnowClient } from './common/client';

export const popnowAuth = PieceAuth.SecretText({
  displayName: 'PopNow API key',
  description: '1. Sign in to [PopNow API console](https://popnow.ai/api/console/keys).\n2. Create a scoped API key and copy it here.\n3. Fund the separate [API USD balance](https://popnow.ai/api/console/billing) before generating. Website credits cannot be used. Model, balance, quote and status reads do not charge for generation.',
  required: true,
  validate: async ({ auth }) => {
    try {
      await popnowClient.request({ auth, path: '/chat/credit' });
      return { valid: true };
    } catch {
      return { valid: false, error: 'Could not validate the PopNow API key. Check the key, permissions and network access.' };
    }
  },
});
