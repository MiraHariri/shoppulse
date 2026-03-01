/**
 * Role Management Lambda Entry Point
 * Routes requests to appropriate handlers based on HTTP method and path
 */

import { APIGatewayEvent, LambdaResponse } from '../userManagement/types';
import {
  listRoles,
  getRole,
  createRole,
  addMetricsToRole,
  removeMetricFromRole,
  deleteRole,
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
    // GET /roles - List all roles
    if (httpMethod === 'GET' && path === '/roles') {
      return await listRoles(event);
    }

    // POST /roles - Create new role
    if (httpMethod === 'POST' && path === '/roles') {
      return await createRole(event);
    }

    // GET /roles/{role} - Get specific role
    if (httpMethod === 'GET' && path.match(/^\/roles\/[^/]+$/) && !path.includes('/metrics')) {
      return await getRole(event);
    }

    // DELETE /roles/{role} - Delete role
    if (httpMethod === 'DELETE' && path.match(/^\/roles\/[^/]+$/) && !path.includes('/metrics')) {
      return await deleteRole(event);
    }

    // POST /roles/{role}/metrics - Add metrics to role
    if (httpMethod === 'POST' && path.match(/^\/roles\/[^/]+\/metrics$/)) {
      return await addMetricsToRole(event);
    }

    // DELETE /roles/{role}/metrics/{metricName} - Remove metric from role
    if (httpMethod === 'DELETE' && path.match(/^\/roles\/[^/]+\/metrics\/[^/]+$/)) {
      return await removeMetricFromRole(event);
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
  listRoles,
  getRole,
  createRole,
  addMetricsToRole,
  removeMetricFromRole,
  deleteRole,
};
