/**
 * FILE: authService.js
 * LOCATION: src/services/api/authService.js
 * CREATED: 2026-02-04
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Handles authentication-related API calls.
 * - Login: Authenticate user and get token
 * - Logout: Invalidate session
 * 
 * ENDPOINTS:
 * - POST /api/token (or /api/auth/login depending on backend)
 * 
 * USAGE:
 * import { authService } from './authService';
 * const response = await authService.login(credentials);
 */

import apiClient from './apiClient';
import secureStorage from '../../utils/secureStorage';

export const authService = {
  /**
   * Login user with credentials
   * @param {Object} credentials - { username, password, companyId }
   * @returns {Promise<AxiosResponse>} Response containing JWT token
   */
  login: (credentials) => {
    // Map to backend LoginRequest model
    const payload = {
      EmailUsername: credentials.username, // UI uses 'username', API expects 'EmailUsername'
      Password: credentials.password,
      CompanyId: parseInt(credentials.companyId) || 1 // API expects integer
    };
    return apiClient.post('/api/user/validate', payload);
  },

  /**
   * Logout user
   * (Optional if backend has server-side session invalidation)
   */
  logout: () => {
    const payload = {
      EmailUsername: '',
      Password: '',
      CompanyId: parseInt(secureStorage.getPlain('companyId'), 10) || 0,
    };
    return apiClient.post('/api/user/logout', payload);
  },

  /**
   * Get user sidebar permissions
   * @param {number} userId
   */
  getSidebarPermissions: (userId) => {
    return apiClient.get(`/api/user/${userId}/permissions`);
  }
};
