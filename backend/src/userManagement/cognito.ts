/**
 * AWS Cognito integration for user management
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

if (!USER_POOL_ID) {
  throw new Error('COGNITO_USER_POOL_ID environment variable is required');
}

/**
 * Creates a user in Cognito User Pool
 * 
 * @param email - User email address
 * @param password - Temporary password
 * @param tenantId - Tenant ID to associate with user
 * @param role - User role
 * @returns Cognito user ID (sub)
 */
export async function createCognitoUser(
  email: string,
  password: string,
  tenantId: string,
  role: string
): Promise<string> {
  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:tenant_id', Value: tenantId },
        { Name: 'custom:role', Value: role },
      ],
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS', // Don't send welcome email (POC)
    });

    const response = await cognitoClient.send(command);

    if (!response.User || !response.User.Username) {
      throw new Error('Failed to create Cognito user: No user returned');
    }

    // Get the user's sub (UUID) from attributes
    const subAttribute = response.User.Attributes?.find((attr) => attr.Name === 'sub');
    if (!subAttribute || !subAttribute.Value) {
      throw new Error('Failed to get Cognito user sub');
    }

    return subAttribute.Value;
  } catch (error: any) {
    console.error('Error creating Cognito user:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'UsernameExistsException') {
      throw new Error('User with this email already exists');
    }
    
    if (error.name === 'InvalidPasswordException') {
      throw new Error('Password does not meet requirements');
    }
    
    throw new Error(`Failed to create Cognito user: ${error.message}`);
  }
}

/**
 * Updates user attributes in Cognito
 * 
 * @param cognitoUserId - Cognito username (email)
 * @param attributes - Attributes to update
 */
export async function updateCognitoUserAttributes(
  cognitoUserId: string,
  attributes: AttributeType[]
): Promise<void> {
  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUserId,
      UserAttributes: attributes,
    });

    await cognitoClient.send(command);
  } catch (error: any) {
    console.error('Error updating Cognito user attributes:', error);
    
    if (error.name === 'UserNotFoundException') {
      throw new Error('User not found in Cognito');
    }
    
    throw new Error(`Failed to update Cognito user: ${error.message}`);
  }
}

/**
 * Updates user role in Cognito
 * 
 * @param cognitoUserId - Cognito username (email)
 * @param role - New role
 */
export async function updateCognitoUserRole(cognitoUserId: string, role: string): Promise<void> {
  await updateCognitoUserAttributes(cognitoUserId, [{ Name: 'custom:role', Value: role }]);
}

/**
 * Deletes a user from Cognito User Pool
 * 
 * @param cognitoUserId - Cognito username (email)
 */
export async function deleteCognitoUser(cognitoUserId: string): Promise<void> {
  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUserId,
    });

    await cognitoClient.send(command);
  } catch (error: any) {
    console.error('Error deleting Cognito user:', error);
    
    if (error.name === 'UserNotFoundException') {
      // User already deleted, consider this success
      console.warn('User not found in Cognito, may have been already deleted');
      return;
    }
    
    throw new Error(`Failed to delete Cognito user: ${error.message}`);
  }
}

/**
 * Gets user details from Cognito
 * 
 * @param cognitoUserId - Cognito username (email)
 * @returns User attributes
 */
export async function getCognitoUser(cognitoUserId: string): Promise<AttributeType[]> {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUserId,
    });

    const response = await cognitoClient.send(command);
    return response.UserAttributes || [];
  } catch (error: any) {
    console.error('Error getting Cognito user:', error);
    
    if (error.name === 'UserNotFoundException') {
      throw new Error('User not found in Cognito');
    }
    
    throw new Error(`Failed to get Cognito user: ${error.message}`);
  }
}
