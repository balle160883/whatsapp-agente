import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { safeDecrypt } from '@/lib/encryption'

// Global in-memory cache for document embeddings
// Key: docId, Value: number[]
const embeddingCache = new Map<string, number[]>()

export function clearEmbeddingCache() {
  embeddingCache.clear()
}

export function cacheEmbedding(id: string, vector: number[]) {
  embeddingCache.set(id, vector)
}

export function getCachedEmbedding(id: string): number[] | undefined {
  return embeddingCache.get(id)
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function getEmbedding(text: string, organizationId: string): Promise<number[]> {
  try {
    const config = await prisma.agentConfig.findUnique({
      where: { organizationId },
      select: { provider: true, apiKeyEnc: true, customEndpoint: true, customModel: true },
    })

    const apiKey = config?.apiKeyEnc ? safeDecrypt(config.apiKeyEnc) : null

    // 1. Try Gemini (Antigravity) if selected
    if (config?.provider === 'ANTIGRAVITY' || (!apiKey && process.env.ANTIGRAVITY_API_KEY)) {
      const activeKey = apiKey || process.env.ANTIGRAVITY_API_KEY
      if (activeKey) {
        const genAI = new GoogleGenerativeAI(activeKey)
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
        const result = await model.embedContent(text)
        if (result?.embedding?.values) {
          return result.embedding.values
        }
      }
    }

    // 2. Try OpenAI / Custom
    const openAIKey = apiKey || process.env.OPENAI_API_KEY
    if (openAIKey) {
      const isCustom = config?.provider === 'CUSTOM'
      const client = new OpenAI({
        apiKey: openAIKey,
        baseURL: isCustom ? config.customEndpoint || undefined : undefined,
      })

      const modelToUse = isCustom
        ? config.customModel?.includes('embedding')
          ? config.customModel
          : 'openai/text-embedding-3-small'
        : 'text-embedding-3-small'

      const response = await client.embeddings.create({
        model: modelToUse,
        input: text,
      })

      if (response?.data?.[0]?.embedding) {
        return response.data[0].embedding
      }
    }

    // 3. Fallback: If organization config fails, try environment keys
    if (process.env.ANTIGRAVITY_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.ANTIGRAVITY_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
      const result = await model.embedContent(text)
      if (result?.embedding?.values) {
        return result.embedding.values
      }
    }

    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })
      if (response?.data?.[0]?.embedding) {
        return response.data[0].embedding
      }
    }

    throw new Error('No AI provider API key found to calculate embeddings')
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    throw error
  }
}
