import { prisma } from './prisma'
import { getEmbedding, getCachedEmbedding, cacheEmbedding, cosineSimilarity } from './ai/embeddings'

interface RagContextResult {
  contextText: string
  hasContext: boolean
  sources?: string[]
}

/**
 * Searches the KnowledgeBase and FAQs for the organization and compiles a context string.
 */
export async function getRagContext(orgId: string, query: string): Promise<RagContextResult> {
  if (!query || query.trim().length < 3) {
    return { contextText: '', hasContext: false, sources: [] }
  }

  const cleanQuery = query.trim()

  // Clean question marks and common Spanish stopwords for search query
  const cleanedQueryForSearch =
    cleanQuery
      .replace(/[¿?¡!]/g, '')
      .split(/\s+/)
      .filter((word) => {
        const lower = word.toLowerCase()
        const stopwords = new Set([
          'quien',
          'quién',
          'quienes',
          'quiénes',
          'como',
          'cómo',
          'cuando',
          'cuándo',
          'donde',
          'dónde',
          'porque',
          'por',
          'qué',
          'que',
          'cual',
          'cuál',
          'cuales',
          'cuáles',
          'es',
          'son',
          'un',
          'una',
          'el',
          'la',
          'los',
          'las',
          'de',
          'del',
          'para',
          'en',
          'con',
          'sobre',
        ])
        return !stopwords.has(lower) && lower.length > 2
      })
      .join(' ') || cleanQuery // Fallback to original if completely empty

  const matchingTexts: string[] = []
  const sources: string[] = []

  let semanticSuccess = false

  try {
    // 1. Try Semantic Vector Search
    const allDocs = await prisma.knowledgeBase.findMany({
      where: { organizationId: orgId },
      select: { id: true, title: true, content: true },
    })

    if (allDocs.length > 0) {
      const queryEmbedding = await getEmbedding(cleanQuery, orgId)

      const scoredDocs = await Promise.all(
        allDocs.map(async (doc) => {
          try {
            let docEmbedding = getCachedEmbedding(doc.id)
            if (!docEmbedding) {
              // Combine title and content for better contextual document representation
              docEmbedding = await getEmbedding(`${doc.title} ${doc.content}`, orgId)
              cacheEmbedding(doc.id, docEmbedding)
            }
            const similarity = cosineSimilarity(queryEmbedding, docEmbedding)
            return { doc, similarity }
          } catch (e) {
            console.error(`Failed to calculate embedding for KB doc ${doc.id}:`, e)
            return { doc, similarity: -1 }
          }
        })
      )

      // Filter by similarity threshold and sort descending
      const threshold = 0.35
      const matches = scoredDocs
        .filter((item) => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)

      if (matches.length > 0) {
        matches.forEach(({ doc, similarity }) => {
          console.log(
            `[RAG Semantic Match] Doc: "${doc.title}", Similarity: ${similarity.toFixed(4)}`
          )
          matchingTexts.push(`Documento: ${doc.title}\nContenido: ${doc.content}`)
          sources.push(doc.title)
        })
        semanticSuccess = true
      }
    }
  } catch (error) {
    console.warn('[RAG Semantic Search Failed] Falling back to database keyword search:', error)
  }

  // 2. Fallback to Full-Text Search if semantic search was not successful or failed
  if (!semanticSuccess) {
    try {
      const dbDocs = await prisma.$queryRaw<Array<{ title: string; content: string }>>`
        SELECT title, content 
        FROM knowledge_bases 
        WHERE organization_id = ${orgId}::uuid
          AND (
            to_tsvector('spanish', title || ' ' || content) @@ plainto_tsquery('spanish', ${cleanedQueryForSearch})
            OR title ILIKE ${`%${cleanedQueryForSearch}%`}
            OR content ILIKE ${`%${cleanedQueryForSearch}%`}
          )
        LIMIT 3
      `

      if (dbDocs && dbDocs.length > 0) {
        dbDocs.forEach((doc) => {
          matchingTexts.push(`Documento: ${doc.title}\nContenido: ${doc.content}`)
          sources.push(doc.title)
        })
      }
    } catch (error) {
      console.error('Error searching KnowledgeBase (RAG fallback):', error)
    }
  }

  try {
    // 2. Search FAQs in memory from AgentConfig
    const agentConfig = await prisma.agentConfig.findUnique({
      where: { organizationId: orgId },
      select: { faqs: true },
    })

    if (agentConfig?.faqs && Array.isArray(agentConfig.faqs)) {
      const queryWords = cleanQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)

      const matchedFaqs = (agentConfig.faqs as Array<{ q: string; a: string }>)
        .filter((faq) => {
          const qLower = faq.q.toLowerCase()
          const aLower = faq.a.toLowerCase()

          // Match if query words are found in the Q or A
          return queryWords.some((word) => qLower.includes(word) || aLower.includes(word))
        })
        .slice(0, 3)

      matchedFaqs.forEach((faq) => {
        matchingTexts.push(`Pregunta Frecuente: ${faq.q}\nRespuesta: ${faq.a}`)
        sources.push(`FAQ: ${faq.q}`)
      })
    }
  } catch (error) {
    console.error('Error searching FAQs (RAG):', error)
  }

  if (matchingTexts.length === 0) {
    return { contextText: '', hasContext: false, sources: [] }
  }

  const contextText = `\n[INFORMACIÓN DE RESPALDO/BASE DE CONOCIMIENTO]\nUsa exclusivamente la siguiente información de respaldo para responder la consulta del cliente si es relevante:\n\n${matchingTexts.join('\n\n')}\n[FIN INFORMACIÓN DE RESPALDO]\n`

  return { contextText, hasContext: true, sources }
}
