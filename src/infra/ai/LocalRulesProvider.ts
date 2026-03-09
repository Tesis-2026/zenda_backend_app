import { Injectable } from '@nestjs/common';
import { AiProvider } from './AiProvider';

@Injectable()
export class LocalRulesProvider implements AiProvider {
  readonly name = 'local-rules';

  async classifyTransaction(_input: string): Promise<unknown> {
    return { provider: this.name, status: 'stub' };
  }

  async generateInsight(_input: string): Promise<unknown> {
    return { provider: this.name, status: 'stub' };
  }
}
