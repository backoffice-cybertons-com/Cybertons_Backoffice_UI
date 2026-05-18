import { APIClient } from "./api_helper";
import * as url from "./url_helper";

const api = new APIClient();

export const getUnreadNotifications = (companyId, userId) =>
    api.get(url.GET_UNREAD_NOTIFICATIONS, { companyId, userId });

export const markNotificationRead = (notificationId, companyId) =>
    api.put(`${url.MARK_NOTIFICATION_READ}/${notificationId}?companyId=${companyId}`, {});

export const markToastShown = (notificationId, companyId) =>
    api.put(`${url.MARK_TOAST_SHOWN}/${notificationId}?companyId=${companyId}`, {});

export const getAllNotifications = (companyId, userId, page = 1, pageSize = 20) =>
    api.get(url.GET_ALL_NOTIFICATIONS, { companyId, userId, page, pageSize });
