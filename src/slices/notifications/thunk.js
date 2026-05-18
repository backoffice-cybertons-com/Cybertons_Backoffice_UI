import { createAsyncThunk } from "@reduxjs/toolkit";
import { 
    getUnreadNotifications as getUnreadNotificationsApi, 
    markNotificationRead as markNotificationReadApi,
    markToastShown as markToastShownApi,
    getAllNotifications as getAllNotificationsApi 
} from "../../helpers/notificationApi";

export const getUnreadNotifications = createAsyncThunk(
    "notifications/getUnreadNotifications",
    async ({ companyId, userId }, { rejectWithValue }) => {
        try {
            const response = await getUnreadNotificationsApi(companyId, userId);
            return response;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const markToastShown = createAsyncThunk(
    "notifications/markToastShown",
    async ({ notificationId, companyId }, { rejectWithValue }) => {
        try {
            const response = await markToastShownApi(notificationId, companyId);
            return { notificationId, response };
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const markNotificationRead = createAsyncThunk(
    "notifications/markNotificationRead",
    async ({ notificationId, companyId }, { rejectWithValue }) => {
        try {
            const response = await markNotificationReadApi(notificationId, companyId);
            return response;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const getAllNotifications = createAsyncThunk(
    "notifications/getAllNotifications",
    async ({ companyId, userId, page, pageSize }, { rejectWithValue }) => {
        try {
            const response = await getAllNotificationsApi(companyId, userId, page, pageSize);
            return response;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);
