# AI Unification: route every capability through the Azure AI Foundry agent

## Context

Before this change the backend used **two** AI integrations behind the
`AiProvider` interface:

- **`AzureFoundryProvider`** (direct Azure OpenAI, API-key auth) served
  expense prediction, recommendations, transaction classification and the
  personalized quiz, each with a built-in statistical/rule fallback.
- **`AzureFoundryAgentClient`** (Azure AI Foundry agent "ZENDA", managed-identity
  auth, RAG/file-search) served only the educational chat (`POST /api/ai/chat`).

This meant two Azure resources, two auth models (key vs managed identity) and
two code paths. The team decided to consolidate **all** AI capabilities onto the
single customized Foundry agent so that every piece of advice is grounded in the
same financial-education knowledge base and authenticated the same way.

This change keeps the deterministic fallback as a safety net so the thesis
reliability metrics (AI prediction accuracy ≥80%, critical error rate <1%) never
depend on a single remote call.

## Tasks Completed

1. `src/infra/ai/statistical-fallback.provider.ts` — new deterministic,
   network-free `AiProvider` implementation (weighted-average prediction,
   50/30/20 rule recommendations, quiz fallback questions). Canonical home for
   the offline-safe logic that previously lived as private methods in
   `AzureFoundryProvider`.
2. `src/infra/ai/azure-agent-ai.provider.ts` — new active `AiProvider` that
   routes prediction, recommendations, classification, quiz and chat through
   `AzureFoundryAgentClient`, parses the agent's JSON defensively and falls back
   to `StatisticalFallbackProvider` on any failure.
3. `src/infra/ai/ai.module.ts` — rebound `AI_PROVIDER` from
   `AzureFoundryProvider` to `AzureAgentAiProvider`; registered the new
   providers. `AzureFoundryProvider` is retained as a dormant alternative.

## What Was Built

### Single AI provider over the Foundry agent

Every `AiProvider` capability now has the same shape: build task-specific
instructions that demand strict JSON, call the agent, parse, and degrade to the
deterministic fallback on failure.

| Capability | Primary (agent) | Fallback (deterministic) |
|------------|-----------------|--------------------------|
| `predictExpenses` | Foundry agent JSON | 3-month weighted moving average |
| `generateRecommendations` | Foundry agent JSON | 50/30/20 rule-based |
| `classifyTransaction` | Foundry agent JSON | `Otros` @ confidence 0 |
| `generatePersonalizedQuiz` | Foundry agent JSON | static fallback questions |
| `chat` | Foundry agent (native RAG) | friendly "try again" message |

### Failure handling (every capability)

```
call agent ──ok──> parse JSON ──ok──> shape result ──> return
   │                   │
   │ throw             │ throw / empty
   ▼                   ▼
       StatisticalFallbackProvider.<sameMethod>()  ──> return
```

The agent is never allowed to break a feature: each method wraps the agent call
in try/catch and returns the deterministic result on any error (timeout, auth,
empty answer, unparseable JSON, zero results).
