# PopNow for Activepieces

A native TypeScript piece for image, video and audio workflows using the [PopNow API](https://popnow.ai/api). Maintained by PopNow AI, LLC; support: support@popnow.ai.

## Availability

This is an independently maintained piece. It is not yet in the official Activepieces cloud catalog. Activepieces currently pauses unsolicited external code PRs, so public-catalog consideration is requested through its Piece Request channel. A downloadable package is provided in this repository's releases for compatible instances that support custom-piece installation. There is no published npm version yet.

## Connection

1. Create a scoped API key in [API keys](https://popnow.ai/api/console/keys).
2. Connect it as **PopNow API key**. Validation reads the balance; it does not generate media.
3. Fund the separate [API USD balance](https://popnow.ai/api/console/billing) before creating tasks. Website credits cannot pay for API calls. No free generation allowance is promised.

## Actions

| Action | Purpose |
| --- | --- |
| List Models | Discover supported public media models, input schemas and examples. |
| Get API Balance | Read available, held and total USD as exact decimal strings. |
| Quote Generation | Price the exact model and input without creating a media task or reserving funds. |
| Create Generation | Submit a paid task with a quote ID, approved maximum USD and stable idempotency key. |
| Get Generation | Read task state, settlement, final USD cost and signed asset URLs. |
| Custom API Call | Advanced relative-path API call; connection keys stay on api.popnow.ai. |

Use **List Models → Quote Generation → budget approval → Create Generation → Get Generation**. Keep model and input identical between quote and create. Quotes expire after five minutes. Copy the approved `max_charge_usd` into `approved_max_usd` as text without floating-point conversion. Use a new idempotency key for each intended task and reuse that key only for its retries.

A successful creation means the task was accepted. It does not mean media is finished. Continue status checks until `succeeded`, `failed`, `expired` or another terminal state. Signed output URLs expire (normally about 20 minutes); treat them as private bearer links, and never send the PopNow API key when fetching an asset.

The discoverable catalog follows PopNow's public agent catalog snapshot dated 2026-10-25. Plus and App-only capabilities are excluded. Live availability and input schemas are fetched from the API. New model IDs require a catalog update.

The advanced custom action can modify data or spend API funds. Its guided task-creation path still requires a quote, approved amount and idempotency key. Do not run arbitrary supplied workflows without reviewing them.

## Development and verification

```sh
npm ci
npm run build
npm run lint
npm test
npm pack
```

The package pins the current published SDK versions (`pieces-framework` 0.32.0, `pieces-common` 0.12.5). It also accepts the newer repository's resolved `secret_text` connection shape. Additive audience, classification and retry metadata are present on all actions. No external SDK patch is required.

The native HTTPS transport explicitly verifies certificates, applies a 60-second timeout, caps responses at 8 MB, never follows redirects and never logs keys, prompts or response bodies. The common package is used for the official custom-action UI factory, not its HTTP transport. The packaged common SDK's HTTP implementation changes a process-wide TLS verification setting; this piece does not call that implementation.

Verification covers compilation, strict lint, native piece metadata loading and mocked protocol/guard tests. A paid end-to-end generation inside an Activepieces instance has not been performed. Do not describe these checks as a cloud acceptance test or official approval.

API reference: [models](https://popnow.ai/docs/models), [tasks](https://popnow.ai/docs/tasks), [billing](https://popnow.ai/docs/billing). Website: [popnow.ai](https://popnow.ai).
