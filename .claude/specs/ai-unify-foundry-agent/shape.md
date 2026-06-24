# Shape: AI Unification — route every capability through the Foundry agent

## Decisions

- **All capabilities through one agent, not a hybrid split** — every
  `AiProvider` method now calls `AzureFoundryAgentClient`. The alternative was
  keeping the hybrid (direct Azure OpenAI for structured tasks, agent only for
  chat). The hybrid is arguably better for latency/cost on high-frequency tasks,
  but the team chose a single integration point: one auth model (managed
  identity), one resource, and advice grounded in the same financial-education
  knowledge base. Consolidation and academic defensibility (citations) outweighed
  the per-call efficiency of direct inference.

- **Keep a deterministic fallback (not pure-agent)** — "everything through the
  agent" does not mean "no safety net". Each capability falls back to
  `StatisticalFallbackProvider` on failure. The alternative (let agent errors
  propagate) was rejected because the thesis metrics (accuracy ≥80%, critical
  error <1%) cannot hinge on a single remote dependency.

- **Fallback is a new `StatisticalFallbackProvider`, not the OpenAI provider** —
  the deterministic logic was given its own home rather than reusing
  `AzureFoundryProvider` as the fallback. Reusing `AzureFoundryProvider` would
  keep the Azure OpenAI **key path alive** as a middle tier, contradicting the
  consolidation goal. `LocalRulesProvider` was rejected because it is an empty
  stub (returns `0` / `[]`), not a real fallback. The genuine statistical/rule
  logic was therefore extracted into `StatisticalFallbackProvider`.

- **Classification stays synchronous (timeout + fallback), not async** — earlier
  discussion considered making classification fire-and-forget. On inspection,
  `POST /api/transactions/classify` (US-0702) is a dedicated request/response
  endpoint that returns a suggested category to the caller; it does **not** run
  inside transaction creation. Making it async would change the API contract. It
  stays synchronous, protected by the agent client's own timeout and the
  deterministic fallback so a slow agent never hangs the suggestion.

- **Defensive JSON extraction, not trust in structured output** — the agent's
  `ask()` returns conversational text that may include prose or citation markers.
  `extractJson()` strips code fences, locates the first `{`/`[` and the matching
  closing bracket, and parses that slice. The alternative (trusting a clean JSON
  body like Azure OpenAI's `response_format: json_object`) does not hold for an
  agent tuned for chat with file-search.

- **`AzureFoundryProvider` retained as a dormant alternative, not deleted** —
  kept in the module (unbound) the same way `LocalRulesProvider` is kept, so a
  key-based Azure OpenAI path remains available by swapping one binding. Deleting
  it was rejected to preserve that option; it is not dead code, it is an
  alternative implementation.

## Constraints

- **An agent failure never breaks a capability** — enforced in
  `AzureAgentAiProvider`: every method wraps the agent call in try/catch and
  returns `StatisticalFallbackProvider.<sameMethod>()` on any error.
- **Empty or zero-result agent answers are treated as failures** —
  `generateRecommendations` and `generatePersonalizedQuiz` throw on empty arrays
  so the deterministic fallback fills in, never returning an empty payload.
- **Single auth model** — all agent traffic authenticates via managed identity
  (`buildCredential()` in `AzureFoundryAgentClient`); no API key is used on the
  active path.
