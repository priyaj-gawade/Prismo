import type { AllowedGeminiModel } from '../contracts/models.ts';

export const ALLOWED_GEMINI_MODELS: readonly AllowedGeminiModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite'
] as const;

export class UnsupportedModelError extends Error {
  constructor(attemptedModel: string) {
    super(
      `Model "${attemptedModel}" is not allowed in D8.7. ` +
      `Allowed models are strictly: ${ALLOWED_GEMINI_MODELS.join(', ')}.`
    );
    this.name = 'UnsupportedModelError';
  }
}

export function validateModelId(modelId: string): AllowedGeminiModel {
  if (ALLOWED_GEMINI_MODELS.includes(modelId as AllowedGeminiModel)) {
    return modelId as AllowedGeminiModel;
  }
  throw new UnsupportedModelError(modelId);
}
