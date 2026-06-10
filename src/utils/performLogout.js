import { authService } from '../services/api/authService';

/** Calls backend logout API so tab_system_log records Logout before client session is cleared. */
export const callLogoutApi = async () => {
    try {
        await authService.logout();
    } catch (err) {
        console.warn('Logout API call failed:', err);
    }
};
