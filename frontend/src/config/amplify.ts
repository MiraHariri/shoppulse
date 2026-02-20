import { Amplify } from 'aws-amplify';
import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '../utils/constants';

/**
 * Configure AWS Amplify for authentication
 */
export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: COGNITO_USER_POOL_ID,
        userPoolClientId: COGNITO_CLIENT_ID,
        loginWith: {
          email: true,
        },
      },
    },
  });
}
