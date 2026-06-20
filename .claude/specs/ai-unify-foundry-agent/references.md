# References: AI Unification — route every capability through the Foundry agent

## Key Files

| File | Change |
|------|--------|
| `src/infra/ai/statistical-fallback.provider.ts` | **New.** Deterministic, network-free `AiProvider` (weighted-average prediction, 50/30/20 rule recommendations, quiz fallback questions). Canonical offline-safe fallback. |
| `src/infra/ai/azure-agent-ai.provider.ts` | **New.** Active `AiProvider` routing all five capabilities through `AzureFoundryAgentClient` with strict-JSON task instructions, defensive parsing, and fallback to `StatisticalFallbackProvider`. |
| `src/infra/ai/ai.module.ts` | Rebound `AI_PROVIDER` to `AzureAgentAiProvider`; registered `StatisticalFallbackProvider` and `AzureAgentAiProvider`; kept `AzureFoundryProvider` as a dormant alternative. |

## Unchanged but relevant

| File | Role |
|------|------|
| `src/infra/ai/azure-foundry-agent.client.ts` | The agent transport (`ask()`); managed-identity auth via `buildCredential()`. Consumed by the new provider. |
| `src/infra/ai/azure-foundry.provider.ts` | Direct Azure OpenAI (key-based). Now a dormant alternative, still registered. |
| `src/infra/ai/AiProvider.ts` | The interface contract; unchanged — all consumers depend on it. |
| `src/modules/transactions/interface/transactions.controller.ts` | `POST /classify` consumer (unchanged; benefits from the new fallback). |
| `src/modules/recommendations/application/use-cases/get-recommendations.use-case.ts` | Recommendations consumer (unchanged). |
| `src/modules/predictions/application/use-cases/get-expense-prediction.use-case.ts` | Prediction consumer (unchanged). |
| `src/modules/education/application/use-cases/get-personalized-quiz.use-case.ts` | Quiz consumer (unchanged). |

## Test Files

No test files were created in this change. **Follow-up:** add a unit spec for
`AzureAgentAiProvider` that mocks the `AzureFoundryAgentClient` boundary and
asserts (a) JSON extraction from prose/citation-wrapped answers and (b) fallback
to `StatisticalFallbackProvider` on agent error/empty output.

## Azure operations (production)

The active path authenticates via the App Service managed identity. Required
production setup (already applied to `zendaapilinuxtesis`):

- User-assigned identity `zendaapilinuxtes-id-ae2d` attached to the App Service.
- Role **Cognitive Services User** (covers `Microsoft.CognitiveServices/*`,
  including `accounts/AIServices/agents/*`) granted to that identity on
  `zenda-rag-agent-resource`.
- App settings: `AZURE_AI_PROJECT_ENDPOINT`, `AZURE_AI_AGENT_NAME=ZENDA`,
  `AZURE_AI_USE_MANAGED_IDENTITY=true`, `AZURE_CLIENT_ID=<identity clientId>`.

## Standards Applied

- `skills/platform/platform-backend/domain-driven-design-nestjs` — port/adapter
  via DI token; infrastructure swap with zero use-case changes.
- `skills/universal/lang-typescript` — no `any`, named exports, parsing narrowed
  to a single localized assertion.
- `skills/universal/core-coding-standards` — single responsibility, fail-soft
  (never fail-silent), DRY "rule of three" applied to the duplicated fallback.
- `skills/assistant/pre-work-audit` — `tsc --noEmit` clean before and after.
