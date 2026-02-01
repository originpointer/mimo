import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { describeWithAIGateway, testModels } from '../fixtures/llm';
import { LLMProvider } from '@mimo/llm';
import { MessageRole } from '@mimo/agent-core/types';

describeWithAIGateway('Core LLM structured output (responseModel)', () => {
  it('complete({responseModel}) returns structuredData conforming to schema', async () => {
    const provider = new LLMProvider();
    const client = provider.getClient(testModels.claude);

    const schema = z.object({ sum: z.number() }).strict();

    const res = await client.complete<{ sum: number }>({
      model: testModels.claude,
      temperature: 0,
      maxTokens: 64,
      messages: [
        { role: MessageRole.SYSTEM, content: 'You output ONLY valid JSON.' },
        { role: MessageRole.USER, content: 'Return {"sum": 15 + 27}.' },
      ],
      responseModel: schema,
    });

    expect(res.structuredData).toBeDefined();
    expect(schema.parse(res.structuredData)).toEqual({ sum: 42 });
  });
});

