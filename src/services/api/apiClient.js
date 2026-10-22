/**
 * FILE: apiClient.js
 * LOCATION: src/services/api/apiClient.js
 * CREATED: 2026-02-04
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Centralized Axios instance for all API calls.
 * - Configures base URL from environment variables
 * - Adds Authorization header (JWT) to requests
 * - Adds X-Company-Id header for tenant isolation
 * - Handles 401 Unauthorized errors (auto-logout)
 * 
 * USAGE:
 * import apiClient from './apiClient';
 * apiClient.get('/api/endpoint');
 */

import axios from 'axios';
import secureStorage from '../../utils/secureStorage';
import { getSelectedFiscalYearId } from '../../utils/fiscalYearStorage';

// Create config object
const config = {
  // Base URL from environment variable (.env)
  // fallback to localhost if not set
 baseURL: process.env.REACT_APP_API_URL || "https://localhost:7067",
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create axios instance
const apiClient = axios.create(config);

/**
 * REQUEST INTERCEPTOR
 * Adds auth token and company ID to every request
 */
apiClient.interceptors.request.use(
  (config) => {
    // 1. Get access token from secure storage
    const token = secureStorage.getSecure('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Get company ID (tenant) from secure/plain storage
    // Company ID is not strictly secret, but consistency helps.
    // Storing as plain text usually fine for ID, but we can check both.
    const companyId = secureStorage.getPlain('companyId');
    if (companyId) {
      config.headers['X-Company-Id'] = companyId;
    }

    const fiscalYearId = getSelectedFiscalYearId();
    if (fiscalYearId) {
      config.headers['X-Fiscal-Year-Id'] = fiscalYearId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles global response errors like 401 (Unauthorized)
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return successful response
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Check for 401 Unauthorized (Token expired or invalid)
    if (response && response.status === 401) {
      // Clear local storage and redirect to login
      secureStorage.clear();
      // Ensure we are not already on login page to avoid loops
      if (!window.location.pathname.includes('/login')) {
         window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
