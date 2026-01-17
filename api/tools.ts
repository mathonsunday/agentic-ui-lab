/**
 * Vercel API Endpoint: /api/tools
 *
 * Tool discovery endpoint for MCP-UI compatibility.
 * Returns available tools and their schemas for client capability negotiation.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toolRegistry } from './lib/toolRegistry.js';

export default (request: VercelRequest, response: VercelResponse) => {
  // Only accept GET requests for discovery
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tools = toolRegistry.list();

    response.status(200).json({
      tools,
      total: tools.length,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing tools:', error);
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
