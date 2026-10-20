/**
 * Returns true when the logged-in user has the Admin role (from sidebar permissions).
 * Checks every permission row — roleName is present on each item from the API.
 */
export const isAdminUser = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
        return false;
    }
    return permissions.some((item) => {
        const roleName = String(item?.roleName || item?.RoleName || '').trim().toLowerCase();
        return roleName === 'admin' || roleName === 'administrator';
    });
};

export default isAdminUser;
