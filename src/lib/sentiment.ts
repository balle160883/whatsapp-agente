export function analyzeSentiment(text: string): {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  score: number
} {
  const lowerText = text.toLowerCase()

  const positiveWords = [
    'excelente',
    'genial',
    'fantástico',
    'maravilloso',
    'perfecto',
    'increíble',
    'bueno',
    'bien',
    'me encanta',
    'gracias',
    'graciás',
    'agradecido',
    'feliz',
    'contento',
    'satisfecho',
    'impresionado',
    'amable',
    'atento',
    'rápido',
    'eficiente',
    'maravilla',
    'espectacular',
    'fabuloso',
    'grandioso',
    'magnífico',
    'exquisito',
    'fenomenal',
    'estupendo',
    'brillante',
    'bonito',
    'hermoso',
    'lindo',
    'adorable',
    'encantador',
    'delicioso',
    'rico',
    'chido',
    'padrisimo',
    'chevere',
    'chévere',
    'bacan',
    'bacán',
    'buenisimo',
    'tuanis',
    '😊',
    '😃',
    '😄',
    '😁',
    '😍',
    '🥰',
    '😇',
    '🤗',
    '👍',
    '💪',
    '✨',
    '🌟',
    '💖',
    '❤️',
    '💕',
  ]

  const negativeWords = [
    'malo',
    'mal',
    'terrible',
    'horrible',
    'pésimo',
    'malísimo',
    'desastroso',
    'abominable',
    'inaceptable',
    'insoportable',
    'frustrante',
    'enojado',
    'molesto',
    'enfadado',
    'decepcionado',
    'disgustado',
    'descontento',
    'nunca más',
    'nunca',
    'jamás',
    'problema',
    'fallo',
    'error',
    'deficiente',
    'incompetente',
    'lento',
    'demorado',
    'tarde',
    'feo',
    'desagradable',
    'antipático',
    'rudo',
    'grosero',
    'idiota',
    'estúpido',
    'menso',
    'tonto',
    'puto',
    'puta',
    'chingar',
    'chingada',
    'mierda',
    'caca',
    'pendejo',
    'culero',
    'pendeja',
    'culera',
    '😠',
    '😡',
    '😤',
    '😢',
    '😭',
    '👎',
    '💩',
    '😒',
    '🙄',
    '😞',
    '😟',
    '😕',
  ]

  let positiveCount = 0
  let negativeCount = 0

  for (const word of positiveWords) {
    if (lowerText.includes(word)) {
      positiveCount++
    }
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) {
      negativeCount++
    }
  }

  let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL'
  const score = positiveCount - negativeCount

  if (score > 0) {
    sentiment = 'POSITIVE'
  } else if (score < 0) {
    sentiment = 'NEGATIVE'
  }

  return {
    sentiment,
    score,
  }
}
