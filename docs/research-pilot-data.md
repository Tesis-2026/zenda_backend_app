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
```

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
