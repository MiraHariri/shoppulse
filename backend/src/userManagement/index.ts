/**
 * User Management Lambda Entry Point
 * Routes requests to appropriate handlers based on HTTP method and path
 */

import { APIGatewayEvent, LambdaResponse } from './types';
import {
  createUser,
  listUsers,
  getUser,
  updateUserRole,
  deleteUser,
} from './handler';

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

    // Route based on HTTP method and path
    if (httpMethod === 'GET' && path === '/users') {
      return await listUsers(event);
    }

    if (httpMethod === 'POST' && path === '/users') {
      return await createUser(event);
    }

    if (httpMethod === 'GET' && path.startsWith('/users/') && !path.includes('/role')) {
      return await getUser(event);
    }

    if (httpMethod === 'PUT' && path.includes('/role')) {
      return await updateUserRole(event);
    }

    if (httpMethod === 'DELETE' && path.startsWith('/users/')) {
      return await deleteUser(event);
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
export {
  createUser,
  listUsers,
  getUser,
  updateUserRole,
  deleteUser,
};
