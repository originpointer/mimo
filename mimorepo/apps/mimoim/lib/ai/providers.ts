import { createGateway } from "@ai-sdk/gateway";

// Create gateway with explicit API key configuration for edge runtime
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export function getLanguageModel(modelId: string) {
  return gateway.languageModel(modelId);
}
