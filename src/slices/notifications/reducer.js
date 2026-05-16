import { createSlice } from "@reduxjs/toolkit";
import { getUnreadNotifications, markNotificationRead, markToastShown, getAllNotifications } from "./thunk";

export const initialState = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
};

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getUnreadNotifications.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(getUnreadNotifications.fulfilled, (state, action) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.length;
            state.loading = false;
        });
        builder.addCase(getUnreadNotifications.rejected, (state, action) => {
            state.error = action.error.message;
            state.loading = false;
        });

        builder.addCase(markNotificationRead.fulfilled, (state, action) => {
            const notificationId = action.meta.arg.notificationId;
            if (Array.isArray(state.notifications)) {
                state.notifications = state.notifications.filter(n => n.notificationId !== notificationId);
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        });

        builder.addCase(markToastShown.fulfilled, (state, action) => {
            const { notificationId } = action.payload;
            if (Array.isArray(state.notifications)) {
                const index = state.notifications.findIndex(n => n.notificationId === notificationId);
                if (index !== -1) {
                    state.notifications[index].toastShown = true;
                }
            }
        });

        builder.addCase(getAllNotifications.fulfilled, (state, action) => {
            state.notifications = action.payload;
            state.loading = false;
        });
    },
});

export default notificationSlice.reducer;
