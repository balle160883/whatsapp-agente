// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Interface & Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, ToolParameter>;
  required?: string[];
  items?: ToolParameter;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: "stop" | "tool_calls" | "error";
}

export interface AIProvider {
  generateResponse(
    messages: ChatMessage[],
    tools: Tool[]
  ): Promise<AIResponse>;
}
