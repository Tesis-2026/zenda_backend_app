import { Module } from '@nestjs/common';
import { LocalRulesProvider } from './LocalRulesProvider';

@Module({
  providers: [LocalRulesProvider],
  exports: [LocalRulesProvider],
})
export class AiModule {}
