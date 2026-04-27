import { createSlice } from "@reduxjs/toolkit";
import {
    getDeliveryChallans,
    addNewDeliveryChallan,
    updateDeliveryChallan,
    deleteDeliveryChallan,
    getDeliveryChallanDetails
} from "./thunk";

export const initialState = {
    deliveryChallans: [],
    deliveryChallanDetails: {},
    isDeliveryChallanCreated: false,
    isDeliveryChallanSuccess: false,
    error: {},
};

const deliveryChallanSlice = createSlice({
    name: "deliveryChallan",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getDeliveryChallans.fulfilled, (state, action) => {
            state.deliveryChallans = action.payload;
            state.isDeliveryChallanSuccess = true;
        });
        builder.addCase(getDeliveryChallans.rejected, (state, action) => {
            state.error = action.payload;
            state.isDeliveryChallanSuccess = false;
        });
        builder.addCase(addNewDeliveryChallan.fulfilled, (state, action) => {
            state.isDeliveryChallanCreated = true;
        });
        builder.addCase(addNewDeliveryChallan.rejected, (state, action) => {
            state.error = action.payload;
            state.isDeliveryChallanCreated = false;
        });
        builder.addCase(updateDeliveryChallan.fulfilled, (state, action) => {
            state.isDeliveryChallanCreated = true;
        });
        builder.addCase(updateDeliveryChallan.rejected, (state, action) => {
            state.error = action.payload;
            state.isDeliveryChallanCreated = false;
        });
        builder.addCase(deleteDeliveryChallan.fulfilled, (state, action) => {
            const deletedId = action.payload && action.payload.id != null ? action.payload.id.toString() : null;
            if (!deletedId) return;

            state.deliveryChallans = (state.deliveryChallans || []).filter((challan) => {
                const challanId =
                    challan.deliveryChallanId ??
                    challan.delivery_challan_id ??
                    challan.delivery_challanId ??
                    challan.DeliveryChallanId;

                if (challanId == null) return true;
                return challanId.toString() !== deletedId;
            });
        });
        builder.addCase(getDeliveryChallanDetails.fulfilled, (state, action) => {
            state.deliveryChallanDetails = action.payload;
        });
    },
});

export default deliveryChallanSlice.reducer;
