/**
 * OpenRouter API Integration for MemoSphere
 * Uses DeepSeek R1 model for AI processing
 */

class OpenRouterClient {
    constructor() {
        this.apiKey = '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';
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'deepseek/deepseek-r1-0528:free';
        this.siteUrl = 'https://memosphere.app';
        this.siteName = 'MemoSphere AI';
    }

    /**
     * Send a chat completion request to OpenRouter
     */
    async chat(messages, options = {}) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': this.siteUrl,
                    'X-Title': this.siteName
                },
                body: JSON.stringify({
                    model: options.model || this.model,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.max_tokens || 2000,
                    ...options
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error ?.message || 'OpenRouter API request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter API error:', error);
            throw error;
        }
    }

    /**
     * Simple query - single user message
     */
    async query(userMessage, options = {}) {
        return await this.chat([
            { role: 'user', content: userMessage }
        ], options);
    }

    /**
     * Query with system prompt
     */
    async queryWithSystem(systemPrompt, userMessage, options = {}) {
        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ], options);
    }

    /**
     * Summarize text content
     */
    async summarize(content, context = 'document') {
        const systemPrompt = `You are an AI assistant specialized in creating clear, concise summaries. 
Focus on extracting the most important information and key points.`;

        const userMessage = `Summarize the following ${context} content:

${content}

Provide a well-structured summary that captures the main points, key decisions, and important details.`;

        return await this.queryWithSystem(systemPrompt, userMessage);
    }

    /**
     * Extract key decisions from content
     */
    async extractDecisions(content) {
        const systemPrompt = `You are an AI assistant that extracts key decisions from meetings and documents.
Return a JSON array of decision strings.`;

        const userMessage = `Extract all key decisions from this content:

${content}

Return ONLY a JSON array of strings, each representing a decision that was made.`;

        const response = await this.queryWithSystem(systemPrompt, userMessage);

        try {
            return JSON.parse(response);
        } catch {
            // Fallback: split by lines
            return response.split('\n').filter(line => line.trim().length > 0);
        }
    }

    /**
     * Generate agenda from content
     */
    async generateAgenda(content) {
        const systemPrompt = `You are an AI assistant that creates structured meeting agendas.
Return a JSON array of agenda items.`;

        const userMessage = `Based on this content, generate a structured meeting agenda:

${content}

Return ONLY a JSON array of strings, each representing an agenda item.`;

        const response = await this.queryWithSystem(systemPrompt, userMessage);

        try {
            return JSON.parse(response);
        } catch {
            return response.split('\n').filter(line => line.trim().length > 0);
        }
    }

    /**
     * Extract action items
     */
    async extractActionItems(content) {
        const systemPrompt = `You are an AI assistant that extracts action items from meetings.
Return a JSON array of action item strings.`;

        const userMessage = `Extract all action items from this content:

${content}

Return ONLY a JSON array of strings, each representing an action item with assignee if mentioned.`;

        const response = await this.queryWithSystem(systemPrompt, userMessage);

        try {
            return JSON.parse(response);
        } catch {
            return response.split('\n').filter(line => line.trim().length > 0);
        }
    }

    /**
     * Structure meeting data comprehensively
     */
    async structureMeeting(transcript, title = 'Meeting', duration = 0) {
        const systemPrompt = `You are an AI assistant that structures meeting transcripts into organized documents.
Extract and organize: summary, description, agenda, discussions, decisions, and action items.
Return valid JSON only.`;

        const userMessage = `Analyze this meeting transcript and structure it:

Title: ${title}
Duration: ${duration} seconds
Transcript:
${transcript}

Return a JSON object with these fields:
{
  "summary": "Brief overall summary (2-3 sentences)",
  "description": "Detailed description of the meeting",
  "agenda": ["array", "of", "agenda items discussed"],
  "discussions": ["array", "of", "main discussion points"],
  "decisions": ["array", "of", "decisions made"],
  "action_items": ["array", "of", "action items with assignees"]
}`;

        const response = await this.queryWithSystem(systemPrompt, userMessage, {
            temperature: 0.5,
            max_tokens: 3000
        });

        try {
            return JSON.parse(response);
        } catch {
            // Fallback structure
            return {
                summary: response.substring(0, 500),
                description: response,
                agenda: [],
                discussions: [],
                decisions: [],
                action_items: []
            };
        }
    }

    /**
     * Answer questions about content
     */
    async answerQuestion(question, contextContent, contextType = 'document') {
        const systemPrompt = `You are a helpful AI assistant with access to ${contextType} content.
Provide accurate, helpful answers based on the provided context.`;

        const userMessage = `Context:
${contextContent}

Question: ${question}

Provide a clear, helpful answer based on the context above.`;

        return await this.queryWithSystem(systemPrompt, userMessage);
    }
}

// Global instance
const openRouterClient = new OpenRouterClient();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.OpenRouterClient = OpenRouterClient;
    window.openRouterClient = openRouterClient;
}