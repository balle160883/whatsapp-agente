import OpenAI from 'openai'
import type { AIProvider, AIResponse, ChatMessage, Tool } from '@/lib/ai/ai-provider'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async generateResponse(messages: ChatMessage[], tools: Tool[]): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ...(tools.length > 0
          ? {
              tools: tools.map((t) => ({
                type: 'function' as const,
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                },
              })),
              tool_choice: 'auto' as const,
            }
          : {}),
      })

      const choice = response.choices[0]

      if (!choice) {
        throw new Error('No response from OpenAI')
      }

      const toolCalls = choice.message.tool_calls
        ?.filter((tc) => tc.type === 'function')
        .map((tc) => ({
          id: tc.id,
          name: (
            tc as { id: string; type: 'function'; function: { name: string; arguments: string } }
          ).function.name,
          arguments: JSON.parse(
            (tc as { id: string; type: 'function'; function: { name: string; arguments: string } })
              .function.arguments
          ) as Record<string, unknown>,
        }))

      return {
        content: choice.message.content ?? '',
        toolCalls,
        finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          provider: 'openai',
          error: error instanceof Error ? error.message : String(error),
        })
      )
      return {
        content: 'Lo siento, hubo un error al procesar tu solicitud.',
        finishReason: 'error',
      }
    }
  }
}
