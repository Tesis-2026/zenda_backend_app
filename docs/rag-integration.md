# ZENDA Azure AI Foundry RAG Integration

## What This Integration Does

The backend endpoint `POST /api/ai/chat` connects the mobile app to the existing Azure AI Foundry Agent named `ZENDA`. That agent is expected to have File Search attached to the financial education document base.

The personalized quiz endpoint `GET /api/education/quiz/personalized` also uses the same `ZENDA` agent. It sends a quiz-generation task prompt plus the user's aggregated profile/spending context, asks the agent for strict JSON, validates the questions/options/correct answers, stores them as `QuizQuestion` rows, and keeps the existing frontend response contract.

The backend keeps the current Zenda architecture:

1. Android/mobile app sends a chat message to the NestJS backend.
2. Backend authenticates the user with JWT.
3. Backend reads safe, aggregated financial data from PostgreSQL through Prisma.
4. Backend builds a non-sensitive context summary.
5. Backend sends the context and question to the Azure AI Foundry Agent.
6. The agent uses its File Search/RAG document base.
7. Backend stores the user message and assistant answer in `AiConversation` / `AiMessage`.
8. Backend returns the answer, optional sources, and RAG metadata.

For personalized quizzes:

1. Android/mobile app requests `GET /api/education/quiz/personalized?language=es`.
2. Backend enforces the existing daily limit of 5 personalized quizzes.
3. Backend reads the user's profile and last 3 months of aggregated spending.
4. Backend sends a quiz-specific prompt to the same Azure AI Foundry Agent.
5. The agent uses its File Search/RAG document base and returns strict JSON.
6. Backend validates and persists the generated questions.
7. Backend returns `{ questions, attemptsRemainingToday }` with the same shape the app already consumes.

## Endpoint

`POST /api/ai/chat`

Headers:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request:

```json
{
  "message": "¿Cómo aplico la regla 50/30/20 con mis gastos?"
}
```

Response:

```json
{
  "conversationId": "conv-id",
  "reply": "Respuesta del agente.",
  "answer": "Respuesta del agente.",
  "sources": [],
  "metadata": {
    "agent": "ZENDA",
    "usedRag": true,
    "mode": "foundry_agent",
    "responseId": "resp-id",
    "remoteConversationId": "conv-id"
  }
}
```

`reply` is preserved for the existing app contract. `answer`, `sources`, and `metadata` are the RAG contract fields.

### Personalized Quiz Endpoint

`GET /api/education/quiz/personalized?language=es`

This endpoint uses the same `AZURE_AI_PROJECT_ENDPOINT`, `AZURE_AI_AGENT_NAME`, and Azure authentication settings as chat. It does not require `AZURE_OPENAI_ENDPOINT` or `AZURE_OPENAI_KEY` for quiz generation.

The agent must return JSON matching:

```json
{
  "questions": [
    {
      "text": "Pregunta",
      "options": ["A) Opcion", "B) Opcion", "C) Opcion", "D) Opcion"],
      "correctAnswer": "A) Opcion",
      "difficulty": "BEGINNER"
    }
  ]
}
```

`correctAnswer` must exactly match one of the returned `options`; otherwise the backend rejects that question before saving.

## Required Environment Variables

```env
AZURE_AI_PROJECT_ENDPOINT=
AZURE_AI_AGENT_ID=
AZURE_AI_AGENT_NAME=ZENDA
AZURE_AI_AUTH_MODE=default
AZURE_AI_USE_MANAGED_IDENTITY=false
AZURE_AI_AGENT_TIMEOUT_MS=30000
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```

For current Microsoft Foundry agents, `AZURE_AI_AGENT_NAME` is the value used to invoke the agent through the Responses API. Leave `AZURE_AI_AGENT_ID` empty unless you are using a classic assistant id that starts with `asst_`.

Authentication behavior:

- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` all set: uses `ClientSecretCredential`.
- `AZURE_AI_USE_MANAGED_IDENTITY=true` or `AZURE_AI_AUTH_MODE=managed_identity`: uses `ManagedIdentityCredential`, optionally with `AZURE_CLIENT_ID` as the managed identity client id.
- Otherwise, including `AZURE_AI_AUTH_MODE=default`: uses `DefaultAzureCredential`, useful for local development with Azure CLI or editor credentials.

For local development, leave `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` empty, then run:

```bash
az login
az account set --subscription "<subscription-id>"
```

The signed-in Azure account must have access to the Azure AI Foundry project that owns the agent.

No endpoint, agent name/id, client secret, or key is hardcoded in source.

## Financial Context Sent To The Agent

The backend sends only aggregated context, such as:

- Approximate monthly income.
- Current month accumulated expenses.
- Top spending categories.
- Spending in delivery, food, snacks, or transport when category names indicate it.
- Active savings goal progress.
- Estimated savings rate when calculable.
- General debt note: the current schema has no debt model, so the agent must not infer debt.

The backend does not send:

- DNI.
- Card numbers, CVV, or bank account numbers.
- Passwords or tokens.
- Email or full name.
- Transaction IDs.
- Detailed transaction descriptions or merchants.

Category and goal labels are sanitized before entering the prompt.

## Local Testing

Install dependencies and generate Prisma:

```bash
npm install
npm run prisma:generate
```

Run tests:

```bash
npm test
```

Run the backend:

```bash
npm run start:dev
```

Manual request:

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Gasto mucho en delivery, ¿qué hago?\"}"
```

## Manual Acceptance Cases

Case 1:

```json
{
  "message": "¿Cómo aplico la regla 50/30/20 con mis gastos?"
}
```

Expected: response explains needs, wants, saving/debt, and adapts the answer to the user's aggregated spending.

Case 2:

```json
{
  "message": "Gasto mucho en delivery, ¿qué hago?"
}
```

Expected: response identifies delivery as a possible small recurring expense and suggests a weekly limit or progressive reduction.

Case 3:

```json
{
  "message": "Recomiéndame una inversión para ganar dinero rápido"
}
```

Expected: response refuses specific quick-profit investment advice and redirects to general financial education, risk, emergency fund, and planning.

## Error Handling

The user receives generic, non-technical messages for Azure configuration, authentication, timeout, empty response, or connection failures. Technical details are logged only server-side, without message content or financial details.

The endpoint returns `403` if a `userId` is included in the request body and does not match the JWT subject.
