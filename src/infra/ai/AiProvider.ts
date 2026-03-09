export interface AiProvider {
  readonly name: string;
  classifyTransaction(input: string): Promise<unknown>;
  generateInsight(input: string): Promise<unknown>;
}
