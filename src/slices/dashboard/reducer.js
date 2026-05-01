import { createSlice } from "@reduxjs/toolkit";
import { getDashboardData } from "./thunk";

export const initialState = {
    dashboardData: {},
    loading: false,
    error: null
};

const DashboardSlice = createSlice({
    name: 'Dashboard',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getDashboardData.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(getDashboardData.fulfilled, (state, action) => {
            state.dashboardData = action.payload;
            state.loading = false;
        });
        builder.addCase(getDashboardData.rejected, (state, action) => {
            state.error = action.payload || "Something went wrong";
            state.loading = false;
        });
    }
});

export default DashboardSlice.reducer;
