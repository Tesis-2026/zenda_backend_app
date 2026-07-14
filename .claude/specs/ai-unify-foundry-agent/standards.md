# Standards Applied: AI Unification — route every capability through the Foundry agent

## Infrastructure (src/infra/ai)

- **Port/adapter via DI token:** consumers depend on the `AiProvider` interface
  through the `AI_PROVIDER` string token, never on a concrete class. Switching
  the active implementation is a one-line `{ provide: AI_PROVIDER, useClass }`
  change — no use case was touched.
- **Single responsibility per provider:** `AzureAgentAiProvider` orchestrates
  (call agent → parse → fallback); `StatisticalFallbackProvider` holds the pure
  deterministic logic. Orchestration and computation are not mixed.
- **Fail-soft, never fail-silent:** every fallback path logs a `warn` with the
  operation name and the underlying error before degrading
  (`logFallback()`); errors are never swallowed without a trace.
- **Defensive parsing at the boundary:** untrusted agent text is parsed in one
  place (`extractJson`) that throws on missing/unterminated JSON, so malformed
  output becomes a clean fallback rather than a runtime crash deeper in a use
  case.

## TypeScript

- **No `any`:** agent responses are parsed into explicit local generic shapes
  (`askJson<T>()`); the unstructured text is the only untyped input and it is
  narrowed immediately.
- **Named exports only**, matching the rest of the codebase.
- **No type assertions beyond the single `JSON.parse(...) as T`** at the parse
  boundary, which is unavoidable and localized.

## DRY

- Per `core-coding-standards` ("extract when you see three duplicates, not
  before"), the deterministic logic now has a canonical home in
  `StatisticalFallbackProvider`. `AzureFoundryProvider` keeps its own private
  copies (two copies total — below the extraction threshold) and was left
  untouched to minimize regression risk on a working file.

## Validation

- Pre-work and post-work audits run per the `pre-work-audit` skill:
  `npx tsc --noEmit` was clean before starting and clean after the change
  (no new type errors introduced).
