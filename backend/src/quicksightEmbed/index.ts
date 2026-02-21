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

  try {
    // Extract HTTP method - handle both REST API and HTTP API formats
    const httpMethod = event.httpMethod || 
                      event.requestContext?.http?.method || 
                      event.requestContext?.httpMethod ||
                      'UNKNOWN';
    
    // Extract path - handle both REST API and HTTP API formats
    const path = event.resource || 
                event.requestContext?.resourcePath ||
                event.routeKey || 
                event.path ||
                '';

    console.log(`Routing request: ${httpMethod} ${path}`);

    // Validate that we have a valid method and path
    if (httpMethod === 'UNKNOWN' || !path) {
      console.error('Unable to determine HTTP method or path from event');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Unable to determine HTTP method or path'
        }),
      };
    }

    // Route: GET /dashboards/embed-url
    if (httpMethod === 'GET' && (path === '/dashboards/embed-url' || path.includes('embed-url'))) {
      return await generateEmbedUrl(event);
    }

    // Unknown route
    console.warn(`Route not found: ${httpMethod} ${path}`);
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Route not found',
        method: httpMethod,
        path: path
      }),
    };
  } catch (error: any) {
    console.error('Unhandled error in Lambda handler:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        retryable: true 
      }),
    };
  }
}

// Export handler functions for testing
export { generateEmbedUrl };
