# Data handling

The piece sends the user's selected model, input (including any referenced media URLs), task identifiers and quote/budget fields to https://api.popnow.ai. The API key is sent only in the Authorization header to that fixed origin. Redirects and arbitrary target hosts are rejected. It does not upload local files, fetch reference media itself or download generated outputs.

Activepieces stores connections, workflow parameters and run outputs according to the operator's configuration. PopNow processes requests and media according to its [Privacy Policy](https://popnow.ai/privacy) and [Terms](https://popnow.ai/terms). Do not put private or sensitive prompts in shared workflow logs. Signed output URLs grant temporary access to the asset and should not be posted publicly.

The code contains no telemetry, advertising, analytics callbacks or hardcoded credentials. User-facing failures do not echo keys, prompts, request bodies or raw upstream errors. Account deletion and retention are controlled by the underlying service and workflow operator.

Contact: support@popnow.ai.
