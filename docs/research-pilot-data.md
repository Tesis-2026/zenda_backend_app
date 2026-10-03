# Research pilot data collection

This branch adds the minimum backend support needed to collect evidence for the
short paper:

`An AI-Based Mobile Application for Personal Financial Management and Its Impact on Financial Literacy among University Students`.

## Stored datasets

- Demographics and initial financial profile: `User.age`, `User.university`,
  `User.incomeType`, `User.averageMonthlyIncome`, `User.financialLiteracyLevel`.
- Financial behavior: `Transaction`, `Budget`, `SavingsGoal`, `Account`.
- Learning impact: `SurveyResponse` for `PRE` and `POST`.
- Usability: `SurveyResponse` for `SUS`, with computed SUS score.
- Satisfaction and intention of use: `SurveyResponse` for `SATISFACTION`,
  including seven Likert items and four open answers.
- AI usage and quality: `AiConversation`, `AiMessage`, and
  `AiMessage.feedbackRating`.
- Usage logs: `AnalyticsEvent`, including client beta metadata such as
  `beta_distribution_id`.

## New endpoints

```text
GET  /api/surveys/satisfaction
GET  /api/surveys/satisfaction/status
POST /api/surveys/satisfaction/response
POST /api/ai/chat/messages/:id/feedback
POST /api/analytics/events
GET  /api/research-dashboard
GET  /api/research-dashboard/summary
GET  /api/research-dashboard/export.json
GET  /api/research-dashboard/export.csv
```

## Research dashboard

The pilot analytics core lives in Zenda's production database, not in Firebase.
Firebase App Distribution is useful for delivery/download visibility, but the
paper metrics are computed from:

- `User` profile fields.
- `AnalyticsEvent` usage logs.
- `Transaction`, `Budget`, `SavingsGoal`, and `Account`.
- `AiConversation`, `AiMessage`, and AI answer feedback.
- `SurveyResponse` for PRE, POST, SUS, and SATISFACTION.
- Qualitative `Feedback`.

Configure a private token in production:

```text
RESEARCH_DASHBOARD_TOKEN="<strong-random-token>"
```

Open the dashboard:

```text
https://<backend-host>/api/research-dashboard?token=<strong-random-token>
```

The stakeholder view is organized as an executive evidence brief: sample and
coverage, comparable PRE/POST impact, adoption, financial behavior, experience,
and anonymized qualitative feedback. It is responsive, printable, and includes
period filters plus direct exports. Evidence maturity is labeled explicitly so
an early cohort is not presented as a conclusive result.

Share the dashboard URL only through a private channel. Keep the production
token outside documents and presentations; rotate it if the URL is exposed.

Useful exports:

```text
https://<backend-host>/api/research-dashboard/export.csv?token=<strong-random-token>
https://<backend-host>/api/research-dashboard/export.json?token=<strong-random-token>
```

Optional date filters:

```text
https://<backend-host>/api/research-dashboard?token=<token>&from=2026-06-01&to=2026-06-30
```

## Illustrative stakeholder scenario

The deterministic `ILLUSTRATIVE_30` cohort persists a complete 30-participant
scenario in PostgreSQL. It is isolated through research enrollment events and
is excluded from the normal dashboard. New real participants therefore do not
change its figures, and the illustrative records do not contaminate the real
pilot view.

Seed or refresh it in a non-production environment:

```powershell
npm run prisma:seed:research-scenario
```

Open only that cohort:

```text
https://<backend-host>/api/research-dashboard?token=<token>&cohort=ILLUSTRATIVE_30
```

The script is idempotent: it replaces only users ending in
`@research-scenario.zenda.invalid`. It validates the rendered dashboard
aggregation after insertion, including the 30 PRE/POST pairs, 54/76 averages,
77.5 SUS, favorable-use counts, behavior changes, feature adoption, and 84/100
independently labeled classification cases. The page displays a permanent
warning that these are synthetic demonstration records.

Production execution is blocked unless
`ALLOW_ILLUSTRATIVE_RESEARCH_SEED=true` is set deliberately for a stakeholder
demo. Never present the illustrative cohort as observed study evidence.

The dashboard intentionally shows aggregated values and qualitative samples
without emails or direct user identifiers.

## Local setup

After pulling this branch, apply the schema and seed data:

```powershell
cd C:\Development\zenda_monorepo_app\zenda_backend_app
npx prisma migrate dev
npx prisma db seed
```

For production or a shared pilot database, use the deployment migration flow:

```powershell
npx prisma migrate deploy
npx prisma db seed
```
