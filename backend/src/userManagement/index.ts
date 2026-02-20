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

  const httpMethod = event.requestContext?.authorizer ? 
    (event as any).httpMethod || (event as any).requestContext?.http?.method : 
    'UNKNOWN';
  const path = (event as any).resource || (event as any).routeKey || '';

  try {
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
export {
  createUser,
  listUsers,
  getUser,
  updateUserRole,
  deleteUser,
};
