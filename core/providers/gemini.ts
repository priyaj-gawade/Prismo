import type {
  AllowedGeminiModel,
  ModelMessage,
  ModelGenerateOptions,
  ModelGenerateResult,
  FunctionCallPart
} from '../contracts/models.ts';
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
      .map((m) => {
        const role = m.role === 'assistant' ? 'model' : (m.role === 'function' ? 'user' : 'user');

        if (m.parts && m.parts.length > 0) {
          const mappedParts = m.parts.map((p) => {
            if (p.functionCall) {
              const { name, args, thought_signature, thought, ...rest } = p.functionCall as Record<string, unknown>;
              return {
                functionCall: { name, args },
                ...(thought_signature ? { thought_signature } : {}),
                ...(thought ? { thought } : {}),
                ...(p.thought_signature ? { thought_signature: p.thought_signature } : {}),
                ...rest
              };
            }
            if (p.functionResponse) {
              return { functionResponse: p.functionResponse };
            }
            return { text: p.text || '' };
          });
          return { role, parts: mappedParts };
        }

        return {
          role,
          parts: [{ text: m.content || '' }]
        };
      });

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

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
    }

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
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Gemini API error [${response.status}]: ${errorText}`);
      (err as unknown as { statusCode: number }).statusCode = response.status;
      throw err;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            functionCall?: { name: string; args?: Record<string, unknown> };
          }>;
        };
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

    const functionCalls: FunctionCallPart[] = [];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          const rawPart = part as Record<string, unknown>;
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args || {},
            ...(rawPart.thought_signature ? { thought_signature: rawPart.thought_signature as string } : {}),
            ...(rawPart.thought ? { thought: rawPart.thought } : {})
          });
        }
      }
    }

    return {
      text,
      model: validatedModel,
      accountId: '', // populated by caller
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      finishReason: candidate?.finishReason,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }
}
