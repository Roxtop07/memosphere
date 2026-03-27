import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// AI service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:11434/api';
const AI_MODEL = process.env.AI_MODEL || 'llama2';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Summarize meeting transcript
router.post('/summarize/meeting/:meetingId', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        orgId: req.user.orgId,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!meeting.transcript) {
      return res.status(400).json({ error: 'Meeting has no transcript to summarize' });
    }

    const summary = await generateSummary(meeting.transcript, 'meeting');

    // Update meeting with summary
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { summary },
    });

    logger.info(`Meeting summarized: ${meeting.id}`);

    res.json({ summary });
  } catch (error) {
    logger.error('Summarize meeting error:', error);
    res.status(500).json({ error: 'Failed to summarize meeting' });
  }
});

// Summarize text
router.post('/summarize', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text, type = 'general' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const summary = await generateSummary(text, type);

    res.json({ summary });
  } catch (error) {
    logger.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize text' });
  }
});

// Extract action items from meeting
router.post('/actions/meeting/:meetingId', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        orgId: req.user.orgId,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!meeting.transcript) {
      return res.status(400).json({ error: 'Meeting has no transcript' });
    }

    const actions = await extractActionItems(meeting.transcript);

    res.json({ actions });
  } catch (error) {
    logger.error('Extract actions error:', error);
    res.status(500).json({ error: 'Failed to extract action items' });
  }
});

// Generate meeting agenda suggestions
router.post('/agenda-suggestions', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { topic, context, previousMeetings } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const suggestions = await generateAgendaSuggestions(topic, context, previousMeetings);

    res.json({ suggestions });
  } catch (error) {
    logger.error('Agenda suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Chat with AI assistant
router.post('/chat', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { message, context, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await chatWithAI(message, context, history);

    res.json({ response });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// Transcribe audio
router.post('/transcribe', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { audioData, language = 'en' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const transcript = await transcribeAudio(audioData, language);

    res.json({ transcript });
  } catch (error) {
    logger.error('Transcribe error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Analyze sentiment
router.post('/sentiment', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const sentiment = await analyzeSentiment(text);

    res.json({ sentiment });
  } catch (error) {
    logger.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Get AI service status
router.get('/status', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    const checks = {
      ollama: false,
      openrouter: false,
    };

    // Check Ollama
    try {
      const ollamaResponse = await fetch(`${AI_SERVICE_URL.replace('/api', '')}/api/tags`);
      checks.ollama = ollamaResponse.ok;
    } catch {
      checks.ollama = false;
    }

    // Check OpenRouter
    if (OPENROUTER_API_KEY) {
      checks.openrouter = true;
    }

    res.json({
      available: checks.ollama || checks.openrouter,
      services: checks,
      model: AI_MODEL,
    });
  } catch (error) {
    logger.error('AI status error:', error);
    res.status(500).json({ error: 'Failed to check AI status' });
  }
});

// Helper functions
async function generateSummary(text: string, type: string): Promise<string> {
  const prompts: Record<string, string> = {
    meeting: `Summarize the following meeting transcript. Focus on key discussion points, decisions made, and action items:\n\n${text}`,
    general: `Summarize the following text concisely:\n\n${text}`,
    policy: `Summarize the following policy document, highlighting key requirements and compliance points:\n\n${text}`,
  };

  const prompt = prompts[type] || prompts.general;

  return await callAI(prompt);
}

async function extractActionItems(transcript: string): Promise<any[]> {
  const prompt = `Extract action items from the following meeting transcript. Return as a JSON array with objects containing: task, assignee (if mentioned), deadline (if mentioned), priority (HIGH/MEDIUM/LOW).\n\n${transcript}\n\nReturn only the JSON array.`;

  const response = await callAI(prompt);

  try {
    // Try to parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch {
    return [];
  }
}

async function generateAgendaSuggestions(topic: string, context?: string, previousMeetings?: string[]): Promise<string[]> {
  let prompt = `Generate 5-7 agenda items for a meeting about: ${topic}`;

  if (context) {
    prompt += `\n\nAdditional context: ${context}`;
  }

  if (previousMeetings && previousMeetings.length > 0) {
    prompt += `\n\nPrevious meeting topics: ${previousMeetings.join(', ')}`;
  }

  prompt += '\n\nReturn as a simple numbered list.';

  const response = await callAI(prompt);

  // Parse numbered list
  const lines = response.split('\n').filter((l) => l.trim());
  return lines.map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter((l) => l.length > 0);
}

async function chatWithAI(message: string, context?: string, history: any[] = []): Promise<string> {
  let prompt = '';

  // Add context if provided
  if (context) {
    prompt += `Context: ${context}\n\n`;
  }

  // Add history
  if (history.length > 0) {
    prompt += 'Previous conversation:\n';
    for (const h of history.slice(-5)) {
      prompt += `${h.role}: ${h.content}\n`;
    }
    prompt += '\n';
  }

  prompt += `User: ${message}\nAssistant:`;

  return await callAI(prompt);
}

async function transcribeAudio(audioData: string, language: string): Promise<string> {
  // This would integrate with Whisper or similar service
  // For now, return a placeholder
  logger.info(`Transcription requested for language: ${language}`);

  // Attempt to use local Whisper service if available
  const whisperUrl = process.env.WHISPER_URL || 'http://localhost:8080/transcribe';

  try {
    const response = await fetch(whisperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: audioData, language }),
    });

    if (response.ok) {
      const result = await response.json() as { text?: string; transcript?: string };
      return result.text || result.transcript || '';
    }
  } catch {
    logger.warn('Whisper service not available');
  }

  return 'Transcription service not available';
}

async function analyzeSentiment(text: string): Promise<any> {
  const prompt = `Analyze the sentiment of the following text. Return a JSON object with: overall (POSITIVE/NEGATIVE/NEUTRAL), confidence (0-1), key_phrases (array of notable phrases).\n\n${text}\n\nReturn only JSON.`;

  const response = await callAI(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return {
    overall: 'NEUTRAL',
    confidence: 0.5,
    key_phrases: [],
  };
}

async function callAI(prompt: string): Promise<string> {
  // Try OpenRouter first if API key is available
  if (OPENROUTER_API_KEY) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        return data.choices?.[0]?.message?.content || '';
      }
    } catch (error) {
      logger.warn('OpenRouter failed, falling back to Ollama');
    }
  }

  // Fall back to Ollama
  try {
    const response = await fetch(`${AI_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { response?: string };
      return data.response || '';
    }
  } catch (error) {
    logger.warn('Ollama service not available');
  }

  throw new Error('No AI service available');
}

export default router;
