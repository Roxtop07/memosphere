// Semantic search and embeddings API
// Uses @xenova/transformers with all-MiniLM-L6-v2 model for local embeddings
import { pipeline } from '@xenova/transformers'

let embedder: any = null

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return embedder
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { texts, query, action = 'embed' } = body

    if (action === 'embed') {
      // Generate embeddings for an array of texts
      if (!Array.isArray(texts) || texts.length === 0) {
        return Response.json({ error: 'texts must be a non-empty array' }, { status: 400 })
      }

      const model = await getEmbedder()
      const embeddings = []

      for (const text of texts) {
        const output = await model(String(text))
        // Extract the embedding array from the tensor
        const embedding = Array.from(output.data)
        embeddings.push({ text: String(text), embedding })
      }

      return Response.json({ embeddings, model: 'all-MiniLM-L6-v2', source: 'local' })

    } else if (action === 'similarity') {
      // Calculate similarity between query and texts
      if (!query || !Array.isArray(texts)) {
        return Response.json({ error: 'query (string) and texts (array) required for similarity' }, { status: 400 })
      }

      const model = await getEmbedder()
      
      // Get query embedding
      const queryOutput = await model(String(query))
      const queryEmbedding = Array.from(queryOutput.data)

      // Get text embeddings and calculate similarities
      const results = []
      for (let i = 0; i < texts.length; i++) {
        const text = String(texts[i])
        const textOutput = await model(text)
        const textEmbedding = Array.from(textOutput.data)

        // Calculate cosine similarity with proper typing
        const dotProduct = (queryEmbedding as number[]).reduce((sum: number, a: number, idx: number) => sum + a * (textEmbedding as number[])[idx], 0)
        const magnitudeA = Math.sqrt((queryEmbedding as number[]).reduce((sum: number, a: number) => sum + a * a, 0))
        const magnitudeB = Math.sqrt((textEmbedding as number[]).reduce((sum: number, b: number) => sum + b * b, 0))
        const similarity = dotProduct / (magnitudeA * magnitudeB)

        results.push({ text, similarity, index: i })
      }

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity)

      return Response.json({ 
        query, 
        results, 
        model: 'all-MiniLM-L6-v2', 
        source: 'local' 
      })

    } else {
      return Response.json({ error: 'action must be "embed" or "similarity"' }, { status: 400 })
    }

  } catch (error) {
    console.error('[semantic-search] error:', error)
    return Response.json({ 
      error: 'Semantic search failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    endpoint: '/api/meetings/semantic-search',
    method: 'POST',
    actions: {
      embed: {
        description: 'Generate embeddings for texts',
        body: { texts: ['array', 'of', 'strings'], action: 'embed' }
      },
      similarity: {
        description: 'Find most similar texts to query',
        body: { query: 'search string', texts: ['array', 'of', 'candidates'], action: 'similarity' }
      }
    },
    model: 'all-MiniLM-L6-v2',
    offline: true,
    examples: [
      'POST {"texts": ["Meeting about AI"], "action": "embed"}',
      'POST {"query": "artificial intelligence", "texts": ["AI meeting", "Budget review", "Tech discussion"], "action": "similarity"}'
    ]
  })
}