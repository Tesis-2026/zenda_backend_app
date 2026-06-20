import { Module } from '@nestjs/common';
import { AzureFoundryProvider } from './azure-foundry.provider';
import { AzureFoundryAgentClient } from './azure-foundry-agent.client';

export const AI_PROVIDER = 'AI_PROVIDER';

@Module({
  providers: [
    AzureFoundryProvider,
    AzureFoundryAgentClient,
    // Bind the interface token to the Azure implementation.
    // Swap to LocalRulesProvider here for fully-offline development.
    { provide: AI_PROVIDER, useClass: AzureFoundryProvider },
  ],
  exports: [AI_PROVIDER, AzureFoundryProvider, AzureFoundryAgentClient],
})
export class AiModule {}
