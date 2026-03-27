// Sentiment analysis API for meeting transcripts
// Uses VADER sentiment analyzer - rule-based, no training required
// @ts-ignore - vader-sentiment has no types but works fine
import vader from 'vader-sentiment'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, transcript, segments } = body

    if (!text && !transcript) {
      return Response.json({ error: 'text or transcript required' }, { status: 400 })
    }

    const inputText = text || transcript

    if (segments && Array.isArray(segments)) {
      // Analyze each segment separately
      const segmentAnalysis = segments.map((segment: string, index: number) => {
        const scores = vader.SentimentIntensityAnalyzer.polarity_scores(String(segment))
        return {
          segment: String(segment),
          index,
          sentiment: {
            compound: scores.compound,
            positive: scores.pos,
            neutral: scores.neu,
            negative: scores.neg
          },
          tone: getToneLabel(scores.compound),
          intensity: getIntensityLabel(Math.abs(scores.compound))
        }
      })

      // Calculate overall meeting sentiment
      const avgCompound = segmentAnalysis.reduce((sum, s) => sum + s.sentiment.compound, 0) / segmentAnalysis.length
      const avgPositive = segmentAnalysis.reduce((sum, s) => sum + s.sentiment.positive, 0) / segmentAnalysis.length
      const avgNegative = segmentAnalysis.reduce((sum, s) => sum + s.sentiment.negative, 0) / segmentAnalysis.length
      const avgNeutral = segmentAnalysis.reduce((sum, s) => sum + s.sentiment.neutral, 0) / segmentAnalysis.length

      return Response.json({
        overall: {
          sentiment: {
            compound: avgCompound,
            positive: avgPositive,
            neutral: avgNeutral,
            negative: avgNegative
          },
          tone: getToneLabel(avgCompound),
          intensity: getIntensityLabel(Math.abs(avgCompound))
        },
        segments: segmentAnalysis,
        insights: generateInsights(segmentAnalysis),
        source: 'vader',
        timestamp: new Date().toISOString()
      })

    } else {
      // Analyze entire text as one piece
      const scores = vader.SentimentIntensityAnalyzer.polarity_scores(String(inputText))
      
      return Response.json({
        text: String(inputText).substring(0, 200) + (inputText.length > 200 ? '...' : ''),
        sentiment: {
          compound: scores.compound,
          positive: scores.pos,
          neutral: scores.neu,
          negative: scores.neg
        },
        tone: getToneLabel(scores.compound),
        intensity: getIntensityLabel(Math.abs(scores.compound)),
        insights: getSingleTextInsights(scores),
        source: 'vader',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[sentiment] error:', error)
    return Response.json({ 
      error: 'Sentiment analysis failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

function getToneLabel(compound: number): string {
  if (compound >= 0.05) return 'positive'
  if (compound <= -0.05) return 'negative'
  return 'neutral'
}

function getIntensityLabel(absCompound: number): string {
  if (absCompound < 0.1) return 'very_low'
  if (absCompound < 0.3) return 'low'
  if (absCompound < 0.6) return 'moderate'
  if (absCompound < 0.8) return 'high'
  return 'very_high'
}

function generateInsights(segments: any[]): string[] {
  const insights = []
  const positiveSegments = segments.filter(s => s.sentiment.compound > 0.1)
  const negativeSegments = segments.filter(s => s.sentiment.compound < -0.1)
  const neutralSegments = segments.filter(s => Math.abs(s.sentiment.compound) <= 0.1)

  insights.push(`Meeting had ${positiveSegments.length} positive, ${negativeSegments.length} negative, and ${neutralSegments.length} neutral segments`)

  if (positiveSegments.length > negativeSegments.length) {
    insights.push('Overall meeting tone was constructive and positive')
  } else if (negativeSegments.length > positiveSegments.length) {
    insights.push('Meeting had some concerns or critical discussions')
  } else {
    insights.push('Meeting maintained a balanced and professional tone')
  }

  // Find most extreme segments
  const mostPositive = segments.reduce((max, s) => s.sentiment.compound > max.sentiment.compound ? s : max, segments[0])
  const mostNegative = segments.reduce((min, s) => s.sentiment.compound < min.sentiment.compound ? s : min, segments[0])

  if (mostPositive && mostPositive.sentiment.compound > 0.3) {
    insights.push(`Most positive moment: "${mostPositive.segment.substring(0, 60)}..."`)
  }

  if (mostNegative && mostNegative.sentiment.compound < -0.3) {
    insights.push(`Most critical point: "${mostNegative.segment.substring(0, 60)}..."`)
  }

  return insights
}

function getSingleTextInsights(scores: any): string[] {
  const insights = []
  const { compound, pos, neu, neg } = scores

  if (compound > 0.5) {
    insights.push('Very positive and enthusiastic tone throughout')
  } else if (compound > 0.1) {
    insights.push('Generally positive and constructive tone')
  } else if (compound < -0.5) {
    insights.push('Strong negative or critical tone')
  } else if (compound < -0.1) {
    insights.push('Some concerns or negative sentiment present')
  } else {
    insights.push('Neutral and factual tone')
  }

  if (pos > 0.3) insights.push('High positive language usage')
  if (neg > 0.2) insights.push('Notable critical or negative language')
  if (neu > 0.7) insights.push('Very factual and objective language')

  return insights
}

export async function GET() {
  return Response.json({
    endpoint: '/api/meetings/sentiment',
    method: 'POST',
    description: 'Analyze sentiment and tone of meeting transcripts',
    input: {
      text: 'Single text string to analyze',
      transcript: 'Alternative to text field',
      segments: 'Array of text segments for detailed analysis'
    },
    output: {
      sentiment: 'Compound, positive, neutral, negative scores',
      tone: 'positive | neutral | negative',
      intensity: 'very_low | low | moderate | high | very_high',
      insights: 'Array of human-readable insights'
    },
    model: 'VADER Sentiment (rule-based)',
    offline: true,
    examples: [
      'POST {"text": "The team agreed to proceed with the proposal"}',
      'POST {"segments": ["Great progress today", "Some concerns about timeline", "Looking forward to next steps"]}'
    ]
  })
}