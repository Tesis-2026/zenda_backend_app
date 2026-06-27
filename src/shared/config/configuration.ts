function normalizeFirebasePrivateKey(value?: string): string {
  let key = (value ?? '').trim().replace(/\\n/g, '\n');

  // dotenv already removes the outer quotes for normal values, but pasted
  // Firebase JSON snippets sometimes leave an extra quote as part of the value.
  for (let i = 0; i < 2; i++) {
    const trimmed = key.trim();
    const wrappedInDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
    const wrappedInSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
    if (!wrappedInDoubleQuotes && !wrappedInSingleQuotes) break;
    key = trimmed.slice(1, -1).trim();
  }

  return key;
}

export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'ZENDA API',
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7),
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  },
  azureOpenAi: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    key: process.env.AZURE_OPENAI_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini',
  },
  azureAiAgent: {
    projectEndpoint: process.env.AZURE_AI_PROJECT_ENDPOINT,
    agentId: process.env.AZURE_AI_AGENT_ID,
    agentName: process.env.AZURE_AI_AGENT_NAME ?? 'ZENDA',
    authMode: process.env.AZURE_AI_AUTH_MODE ?? 'default',
    useManagedIdentity: process.env.AZURE_AI_USE_MANAGED_IDENTITY === 'true',
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    timeoutMs: Number(process.env.AZURE_AI_AGENT_TIMEOUT_MS ?? 30000),
  },
  azureDocumentIntelligence: {
    endpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    key: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
    modelId:
      process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID ?? 'prebuilt-receipt',
    timeoutMs: Number(
      process.env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS ?? 30000,
    ),
  },
  researchDashboard: {
    token: process.env.RESEARCH_DASHBOARD_TOKEN ?? '',
  },
  email: {
    host: process.env.SMTP_HOST ?? 'smtp.example.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Zenda <noreply@zenda.app>',
  },
  fcm: {
    // 3-field split (matches Azure config style). All three must be set for
    // FCM to be considered configured; otherwise FcmService runs in no-op mode
    // and the inbox row is still written.
    projectId: process.env.FCM_PROJECT_ID ?? '',
    clientEmail: process.env.FCM_CLIENT_EMAIL ?? '',
    privateKey: normalizeFirebasePrivateKey(process.env.FCM_PRIVATE_KEY),
  },
});
