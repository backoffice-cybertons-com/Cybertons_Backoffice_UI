import { createSlice } from "@reduxjs/toolkit";
import {
    getPurchaseTransactions,
    addNewPurchaseTransaction,
    updatePurchaseTransaction,
    deletePurchaseTransaction,
    getPurchaseTransactionDetails
} from './thunk';

export const initialState = {
    purchaseTransactions: [],
    purchaseTransactionDetail: {},
    error: {},
    isPurchaseTransactionCreated: false,
    isPurchaseTransactionSuccess: false,
};

const PurchaseTransactionSlice = createSlice({
    name: 'PurchaseTransactionSlice',
    initialState,
    reducers: {
        resetPurchaseTransactionCreated(state) {
            state.isPurchaseTransactionCreated = false;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(getPurchaseTransactions.fulfilled, (state, action) => {
            state.purchaseTransactions = action.payload.data || action.payload || [];
            state.isPurchaseTransactionCreated = false;
            state.isPurchaseTransactionSuccess = true;
        });
        builder.addCase(getPurchaseTransactions.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
            state.isPurchaseTransactionCreated = false;
            state.isPurchaseTransactionSuccess = false;
        });
        builder.addCase(getPurchaseTransactionDetails.fulfilled, (state, action) => {
            state.purchaseTransactionDetail = action.payload.data || action.payload || {};
        });
        builder.addCase(addNewPurchaseTransaction.fulfilled, (state, action) => {
            const newHeader = action.payload?.data?.header || action.payload?.header || action.payload;
            if (newHeader && Array.isArray(state.purchaseTransactions)) {
                state.purchaseTransactions.unshift(newHeader);
            } else if (newHeader) {
                state.purchaseTransactions = [newHeader];
            }
            state.isPurchaseTransactionCreated = true;
        });
        builder.addCase(addNewPurchaseTransaction.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
        builder.addCase(updatePurchaseTransaction.fulfilled, (state, action) => {
            const updatedHeader = action.payload?.data?.header || action.payload?.header || action.payload;
            if (updatedHeader && Array.isArray(state.purchaseTransactions)) {
                state.purchaseTransactions = state.purchaseTransactions.map(item =>
                    item.spUniqueCode?.toString() === updatedHeader.spUniqueCode?.toString()
                        ? { ...item, ...updatedHeader }
                        : item
                );
            }
            state.isPurchaseTransactionCreated = true; // triggers navigation after edit save
        });
        builder.addCase(updatePurchaseTransaction.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
        builder.addCase(deletePurchaseTransaction.fulfilled, (state, action) => {
            if (Array.isArray(state.purchaseTransactions)) {
                state.purchaseTransactions = state.purchaseTransactions.filter(
                    item => item.spUniqueCode?.toString() !== action.payload.id?.toString()
                );
            }
        });
        builder.addCase(deletePurchaseTransaction.rejected, (state, action) => {
            state.error = action.payload || action.error || null;
        });
    }
});

export const { resetPurchaseTransactionCreated } = PurchaseTransactionSlice.actions;
export default PurchaseTransactionSlice.reducer;
