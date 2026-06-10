/**
 * Returns true when the logged-in user has the Admin role (from sidebar permissions).
 */
export const isAdminUser = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
        return false;
    }
    const roleName = permissions[0]?.roleName || permissions[0]?.RoleName || '';
    return String(roleName).toLowerCase() === 'admin';
};

export default isAdminUser;
