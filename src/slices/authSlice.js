/**
 * FILE: authSlice.js
 * LOCATION: src/slices/authSlice.js
 * CREATED: 2026-02-04
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Redux slice for managing authentication state.
 * - Stores: user info, loading status, error messages
 * - PERSISTENCE: Syncs with secureStorage for token handling
 * 
 * ACTIONS:
 * - loginUser: Async thunk to call login API
 * - logoutUser: Sync action to clear state and storage
 * 
 * DEPENDENCIES:
 * - authService: For API calls
 * - secureStorage: For saving tokens
 * - jwt-decode: For extracting user info from token
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/api/authService';
import secureStorage from '../utils/secureStorage';
import { jwtDecode } from 'jwt-decode';
import { clearSelectedFiscalYearId } from '../utils/fiscalYearStorage';

/**
 * ASYNC ACTION: loginUser
 * api/token returns { token: "..." } usually
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      // API returns: { Token: "...", User: { Id: ..., Username: ..., Email: ..., ... } }
      const apiData = response.data;
      const token = apiData.token || apiData.Token;
      const userData = apiData.user || apiData.User || apiData;
      
      // 1. Initialize secure storage with username/id from credentials or response
      // We use username as part of the key salt
      secureStorage.initKey(credentials.username);
      
      // 2. Save token securely
      secureStorage.setSecure('authToken', token);
      secureStorage.setPlain('companyId', credentials.companyId);
      
      // 3. Decode token to get user info (JWT claims)
      const decoded = jwtDecode(token);
      
      // 4. Store user data in localStorage for LayoutMenuData compatibility
      // Format: { user: { id: ..., username: ..., email: ..., fullName: ..., ... } }
      const sessionUser = {
        user: {
          id: userData.id || userData.Id || decoded.NameIdentifier || decoded.sub,
          username: userData.username || userData.Username || decoded.Name || decoded.username || credentials.username,
          email: userData.email || userData.Email || decoded.Email || decoded.email,
          fullName: userData.fullName || userData.FullName || userData.full_name || decoded.FullName || decoded.fullName,
          firstName: userData.firstName || userData.first_name || decoded.firstName || decoded.first_name,
          companyId: userData.companyId || userData.CompanyId || credentials.companyId
        },
        token: token
      };
      localStorage.setItem('authUser', JSON.stringify(sessionUser));
      
      return {
        user: decoded, // Contains claims like sub, email, role
        token,
        userData: sessionUser.user // Full user object for reference
      };
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      } else {
        return rejectWithValue({ message: 'Login failed. Please try again.' });
      }
    }
  }
);

/**
 * INITIAL STATE
 * Try to restore session on load
 */
const token = secureStorage.getSecure('authToken');
let user = null;
if (token) {
  try {
    user = jwtDecode(token);
    // Restore localStorage if it doesn't exist but we have a valid token
    if (!localStorage.getItem('authUser') && user) {
      console.log(`[Auth Diagnostic] Token found, but authUser missing in localStorage. Restoring...`);
      const companyId = secureStorage.getPlain('companyId') || '1';
      const sessionUser = {
        user: {
          id: user.NameIdentifier || user.sub || user.id,
          username: user.Name || user.username || user.Username,
          email: user.Email || user.email,
          fullName: user.FullName || user.fullName || user.full_name,
          firstName: user.firstName || user.first_name,
          companyId: companyId
        },
        token: token
      };
      localStorage.setItem('authUser', JSON.stringify(sessionUser));
    } else if (user) {
      console.log(`[Auth Diagnostic] Session restored successfully for: ${user.Name || user.username}`);
    }
  } catch (e) {
    console.error(`[Auth Diagnostic] Session restoration failed! Clearing storage.`, e);
    secureStorage.clear();
    localStorage.removeItem('authUser');
  }
} else {
  console.log(`[Auth Diagnostic] No authToken found. Redirection to login expected if page is protected.`);
}

const initialState = {
  user: user,
  token: token,
  isAuthenticated: !!token,
  loading: false,
  error: null,
  permissions: [], // Store available tab permissions
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      secureStorage.clear();
      localStorage.removeItem('authUser'); // Clear localStorage on logout
      clearSelectedFiscalYearId();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.permissions = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    setPermissions: (state, action) => {
      state.permissions = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        // Handle error message structure
        state.error = action.payload?.message || action.payload || 'Login failed';
      });
  },
});

export const { logoutUser, clearError, setPermissions } = authSlice.actions;
export default authSlice.reducer;
