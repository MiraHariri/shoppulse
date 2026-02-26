// API and configuration constants
export const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '';
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
export const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

// User roles
export const USER_ROLES = {
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  OPERATIONS: 'Ops',
  MARKETING: 'Marketing',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES] | string;

// User status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// API endpoints
export const API_ENDPOINTS = {
  USERS: '/users',
  ROLES: '/roles',
  DASHBOARD_EMBED: '/dashboards/embed-url',
  GOVERNANCE_RULES: '/governance/rules',
} as const;

// Dashboard refresh interval (10 minutes in milliseconds)
export const DASHBOARD_REFRESH_INTERVAL = 10 * 60 * 1000;

// Embed URL expiration (15 minutes in milliseconds)
export const EMBED_URL_EXPIRATION = 15 * 60 * 1000;

// Available metrics for role assignment
export const AVAILABLE_METRICS = [
  'Net_Revenue',
  'Margin',
  'Fulfillment_SLA',
  'Campaign_ROI',
] as const;

export type MetricName = typeof AVAILABLE_METRICS[number];

