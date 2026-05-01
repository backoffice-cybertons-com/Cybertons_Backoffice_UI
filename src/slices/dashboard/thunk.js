import { createAsyncThunk } from "@reduxjs/toolkit";
import { getDashboardData as getDashboardDataApi } from "../../helpers/fakebackend_helper";

export const getDashboardData = createAsyncThunk("dashboard/getDashboardData", async (data) => {
    try {
        const response = await getDashboardDataApi(data);
        return response;
    } catch (error) {
        return error;
    }
});
