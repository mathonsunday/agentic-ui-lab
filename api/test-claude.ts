/**
 * Test endpoint to verify Claude API key works
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export default async (
  _request: VercelRequest,
  response: VercelResponse
) => {
  try {
    console.log('Test endpoint: API key exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('Test endpoint: API key length:', process.env.ANTHROPIC_API_KEY?.length);

    if (!process.env.ANTHROPIC_API_KEY) {
      return response.status(500).json({
        error: 'No API key found',
        available_env_vars: Object.keys(process.env).filter(k =>
          k.includes('ANTHROPIC') || k.includes('API')
        ),
      });
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('Test endpoint: Client created');

    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say "hello"',
        },
      ],
    });

    console.log('Test endpoint: Message created successfully');

    return response.status(200).json({
      success: true,
      message: message.content[0].type === 'text' ? message.content[0].text : 'No text',
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      error_type: error instanceof Error ? error.name : typeof error,
    });
  }
};
