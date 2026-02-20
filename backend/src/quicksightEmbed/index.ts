/**
 * QuickSight Embed Lambda Entry Point
 * Routes requests to appropriate handlers
 */

import { APIGatewayEvent, LambdaResponse } from './types';
import { generateEmbedUrl } from './handler';

/**
 * Lambda handler function
 * Routes requests based on HTTP method and resource path
 */
export async function handler(event: APIGatewayEvent): Promise<LambdaResponse> {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const httpMethod = event.requestContext?.authorizer ? 
    (event as any).httpMethod || (event as any).requestContext?.http?.method : 
    'UNKNOWN';
  const path = (event as any).resource || (event as any).routeKey || '';

  try {
    // Route: GET /dashboards/embed-url
    if (httpMethod === 'GET' && path === '/dashboards/embed-url') {
      return await generateEmbedUrl(event);
    }

    // Unknown route
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error: any) {
    console.error('Unhandled error in Lambda handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error', retryable: true }),
    };
  }
}

// Export handler functions for testing
export { generateEmbedUrl };
