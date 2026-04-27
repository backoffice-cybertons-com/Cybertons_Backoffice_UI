import { createSlice } from "@reduxjs/toolkit";
import {
    getPaymentReceipts,
    addNewPaymentReceipt,
    updatePaymentReceipt,
    deletePaymentReceipt,
    getPaymentReceiptDetails,
    getPendingInvoices
} from './thunk';

export const initialState = {
    paymentReceipts: [],
    paymentReceiptDetail: null,
    pendingInvoices: [],
    error: {},
    isPaymentReceiptCreated: false,
    isPaymentReceiptSuccess: false,
};

const PaymentReceiptSlice = createSlice({
    name: 'PaymentReceiptSlice',
    initialState,
    reducers: {
        resetPaymentReceiptCreated(state) {
            state.isPaymentReceiptCreated = false;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(getPaymentReceipts.fulfilled, (state, action) => {
            state.paymentReceipts = action.payload.data || action.payload || [];
            state.isPaymentReceiptCreated = false;
            state.isPaymentReceiptSuccess = true;
        });
        builder.addCase(getPaymentReceipts.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
            state.isPaymentReceiptCreated = false;
            state.isPaymentReceiptSuccess = false;
        });
        builder.addCase(getPaymentReceiptDetails.fulfilled, (state, action) => {
            state.paymentReceiptDetail = action.payload.data || action.payload || null;
        });
        builder.addCase(getPendingInvoices.fulfilled, (state, action) => {
            state.pendingInvoices = action.payload.data || action.payload || [];
        });
        builder.addCase(addNewPaymentReceipt.fulfilled, (state, action) => {
            state.isPaymentReceiptCreated = true;
        });
        builder.addCase(addNewPaymentReceipt.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
        builder.addCase(updatePaymentReceipt.fulfilled, (state, action) => {
            state.isPaymentReceiptCreated = true;
        });
        builder.addCase(updatePaymentReceipt.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
        builder.addCase(deletePaymentReceipt.fulfilled, (state, action) => {
            if (Array.isArray(state.paymentReceipts)) {
                state.paymentReceipts = state.paymentReceipts.filter(
                    item => item.jv_code?.toString() !== action.payload.id?.toString()
                );
            }
        });
    }
});

export const { resetPaymentReceiptCreated } = PaymentReceiptSlice.actions;
export default PaymentReceiptSlice.reducer;
