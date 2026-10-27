import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { popnowAuth } from './lib/auth';
import { listModels } from './lib/actions/list-models';
import { getBalance } from './lib/actions/get-balance';
import { quoteGeneration } from './lib/actions/quote-generation';
import { createGeneration } from './lib/actions/create-generation';
import { getGeneration } from './lib/actions/get-generation';
import { customApiCall } from './lib/actions/custom-api-call';

export const popnow = createPiece({
  displayName: 'PopNow',
  description: 'Create images, videos and audio with model discovery, exact USD quotes, approved spending and asynchronous task tracking.',
  logoUrl: 'https://popnow.ai/brand/popnow-logo.png',
  authors: ['kyuminjo'], categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
  minimumSupportedRelease: '0.80.0',
  auth: popnowAuth,
  actions: [listModels, getBalance, quoteGeneration, createGeneration, getGeneration, customApiCall],
  triggers: [],
});
