/**
 * Splits a text into smaller segments (chunks) of a given size with overlap,
 * attempting to break chunks cleanly at sentences, paragraphs, or spaces.
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  if (!text) return []
  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize

    // Adjust endIndex to try and find a sentence end or paragraph end or space,
    // so we don't break words or sentences if possible.
    if (endIndex < text.length) {
      let foundBreak = false
      // Look back up to 100 characters for a punctuation mark (. ! ?) followed by space, or a newline
      for (let i = endIndex; i > endIndex - 100; i--) {
        const char = text[i]
        const nextChar = text[i + 1]
        if (
          (char === '.' || char === '!' || char === '?') &&
          (nextChar === ' ' || nextChar === '\n')
        ) {
          endIndex = i + 1
          foundBreak = true
          break
        }
        if (char === '\n') {
          endIndex = i
          foundBreak = true
          break
        }
      }
      // If we didn't find a clean sentence/paragraph break, try to find a space
      if (!foundBreak) {
        for (let i = endIndex; i > endIndex - 50; i--) {
          if (text[i] === ' ') {
            endIndex = i
            break
          }
        }
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    startIndex = endIndex - overlap
    if (startIndex >= text.length) break
    // Make sure we actually advance to avoid infinite loop
    if (startIndex <= 0 || startIndex >= endIndex) {
      startIndex = endIndex
    }
  }

  return chunks
}
