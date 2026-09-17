import type { AllowedGeminiModel, ModelMessage, ModelGenerateOptions, ModelGenerateResult } from '../contracts/models.ts';
import { validateModelId } from './allowlist.ts';

export class GeminiApiClient {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  async generateContent(
    apiKey: string,
    model: AllowedGeminiModel,
    messages: ModelMessage[],
    options: ModelGenerateOptions = {}
  ): Promise<ModelGenerateResult> {
    const validatedModel = validateModelId(model);

    // Transform messages to Gemini format
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    // Extract system instructions if any
    const systemInstructionContent = options.systemInstruction ||
      messages.find((m) => m.role === 'system')?.content;

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 8192,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
        ...(options.responseSchema ? { responseSchema: options.responseSchema } : {})
      }
    };

    if (systemInstructionContent) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstructionContent }]
      };
    }

    const url = `${this.baseUrl}/${validatedModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Gemini API error [${response.status}]: ${errorText}`);
      (err as unknown as { statusCode: number }).statusCode = response.status;
      throw err;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';

    return {
      text,
      model: validatedModel,
      accountId: '', // populated by caller
      finishReason: candidate?.finishReason,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }
}
