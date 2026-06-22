import type { AIProvider, AIResponse, ChatMessage, Tool } from '@/lib/ai/ai-provider'

interface CustomProviderConfig {
  apiKey: string
  endpoint: string
  model: string
}

export class CustomProvider implements AIProvider {
  private config: CustomProviderConfig

  constructor(config: CustomProviderConfig) {
    this.config = config
  }

  async generateResponse(messages: ChatMessage[], tools: Tool[]): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          ...(tools.length > 0
            ? {
                tools: tools.map((t) => ({
                  type: 'function',
                  function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                  },
                })),
                tool_choice: 'auto',
              }
            : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(`Custom provider returned ${response.status}`)
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string | null
            tool_calls?: Array<{
              id: string
              function: { name: string; arguments: string }
            }>
          }
          finish_reason: string
        }>
      }

      const choice = data.choices[0]
      if (!choice) throw new Error('No response from custom provider')

      const toolCalls = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }))

      return {
        content: choice.message.content ?? '',
        toolCalls,
        finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(
        JSON.stringify({
          level: 'error',
          provider: 'custom',
          endpoint: this.config.endpoint,
          error: errorMsg,
        })
      )
      return {
        content: `Error del proveedor personalizado: ${errorMsg}`,
        finishReason: 'error',
      }
    }
  }
}
