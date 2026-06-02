import { GoogleGenerativeAI, Tool as GeminiTool, FunctionDeclaration } from "@google/generative-ai";
import type {
  AIProvider,
  AIResponse,
  ChatMessage,
  Tool,
} from "@/lib/ai/ai-provider";

export class AntigravityProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.0-flash-exp") {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generateResponse(
    messages: ChatMessage[],
    tools: Tool[]
  ): Promise<AIResponse> {
    try {
      const geminiTools: GeminiTool[] = tools.length > 0
        ? [
            {
              functionDeclarations: tools.map(
                (t): FunctionDeclaration => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters as FunctionDeclaration["parameters"],
                })
              ),
            },
          ]
        : [];

      // Extract system prompt
      const systemMsg = messages.find((m) => m.role === "system");
      const conversationMessages = messages.filter((m) => m.role !== "system");

      const genModel = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemMsg?.content,
        tools: geminiTools.length > 0 ? geminiTools : undefined,
      });

      // Convert to Gemini history format
      const history = conversationMessages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const lastMessage =
        conversationMessages[conversationMessages.length - 1];

      const chat = genModel.startChat({ history });
      const result = await chat.sendMessage(lastMessage?.content ?? "");
      const response = result.response;

      // Check for function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const toolCalls = functionCalls.map((fc, i) => ({
          id: `call_${i}`,
          name: fc.name,
          arguments: fc.args as Record<string, unknown>,
        }));
        return {
          content: "",
          toolCalls,
          finishReason: "tool_calls",
        };
      }

      return {
        content: response.text(),
        finishReason: "stop",
      };
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          provider: "antigravity",
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return {
        content: "Lo siento, hubo un error al procesar tu solicitud.",
        finishReason: "error",
      };
    }
  }
}
