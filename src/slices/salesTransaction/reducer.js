import { createSlice } from "@reduxjs/toolkit";
import {
    getSalesTransactions,
    addNewSalesTransaction,
    updateSalesTransaction,
    deleteSalesTransaction,
    getSalesTransactionDetails
} from './thunk';

export const initialState = {
    SalesTransactions: [],
    SalesTransactionDetail: {},
    error: {},
    isSalesTransactionCreated: false,
    isSalesTransactionSuccess: false,
};

const SalesTransactionSlice = createSlice({
    name: 'SalesTransactionSlice',
    initialState,
    reducers: {
        resetSalesTransactionCreated(state) {
            state.isSalesTransactionCreated = false;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(getSalesTransactions.fulfilled, (state, action) => {
            state.SalesTransactions = action.payload.data || action.payload || [];
            state.isSalesTransactionCreated = false;
            state.isSalesTransactionSuccess = true;
        });
        builder.addCase(getSalesTransactions.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
            state.isSalesTransactionCreated = false;
            state.isSalesTransactionSuccess = false;
        });
        builder.addCase(getSalesTransactionDetails.fulfilled, (state, action) => {
            state.SalesTransactionDetail = action.payload.data || action.payload || {};
        });
        builder.addCase(addNewSalesTransaction.fulfilled, (state, action) => {
            const newHeader = action.payload?.data?.header || action.payload?.header || action.payload;
            if (newHeader && Array.isArray(state.SalesTransactions)) {
                state.SalesTransactions.unshift(newHeader);
            } else if (newHeader) {
                state.SalesTransactions = [newHeader];
            }
            state.isSalesTransactionCreated = true;
        });
        builder.addCase(addNewSalesTransaction.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
        builder.addCase(updateSalesTransaction.fulfilled, (state, action) => {
            const updatedHeader = action.payload?.data?.header || action.payload?.header || action.payload;
            if (updatedHeader && Array.isArray(state.SalesTransactions)) {
                state.SalesTransactions = state.SalesTransactions.map(item =>
                    item.spUniqueCode?.toString() === updatedHeader.spUniqueCode?.toString()
                        ? { ...item, ...updatedHeader }
                        : item
                );
            }
            state.isSalesTransactionCreated = true; // triggers navigation after edit save
        });
        builder.addCase(updateSalesTransaction.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
        builder.addCase(deleteSalesTransaction.fulfilled, (state, action) => {
            if (Array.isArray(state.SalesTransactions)) {
                state.SalesTransactions = state.SalesTransactions.filter(
                    item => item.spUniqueCode?.toString() !== action.payload.id?.toString()
                );
            }
        });
        builder.addCase(deleteSalesTransaction.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
    }
});

export const { resetSalesTransactionCreated } = SalesTransactionSlice.actions;
export default SalesTransactionSlice.reducer;
