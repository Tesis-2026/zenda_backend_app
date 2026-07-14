import { Module } from '@nestjs/common';
import { AzureFoundryProvider } from './azure-foundry.provider';
import { AzureFoundryAgentClient } from './azure-foundry-agent.client';
import { AzureAgentAiProvider } from './azure-agent-ai.provider';
import { StatisticalFallbackProvider } from './statistical-fallback.provider';

export const AI_PROVIDER = 'AI_PROVIDER';

@Module({
  providers: [
    AzureFoundryAgentClient,
    StatisticalFallbackProvider,
    AzureAgentAiProvider,
    // Bind the interface token to the customized Azure AI Foundry agent: every
    // AI capability (prediction, recommendations, classification, quiz, chat)
    // flows through the single agent "ZENDA", with StatisticalFallbackProvider
    // as the deterministic safety net. AzureFoundryProvider (direct Azure OpenAI,
    // key-based) is kept as a dormant alternative — swap it in here to use it.
    { provide: AI_PROVIDER, useClass: AzureAgentAiProvider },
    AzureFoundryProvider,
  ],
  exports: [AI_PROVIDER, AzureFoundryProvider, AzureFoundryAgentClient],
})
export class AiModule {}
