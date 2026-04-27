import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    getPaymentReceipts as getPaymentReceiptsApi,
    getPaymentReceiptDetails as getPaymentReceiptDetailsApi,
    addNewPaymentReceipt as addNewPaymentReceiptApi,
    updatePaymentReceipt as updatePaymentReceiptApi,
    deletePaymentReceipt as deletePaymentReceiptApi,
    getPendingInvoices as getPendingInvoicesApi
} from "../../helpers/fakebackend_helper";

export const getPaymentReceipts = createAsyncThunk("paymentReceipt/getPaymentReceipts", async (params) => {
    try {
        const response = await getPaymentReceiptsApi(params);
        return response;
    } catch (error) {
        return error;
    }
});

export const getPaymentReceiptDetails = createAsyncThunk("paymentReceipt/getPaymentReceiptDetails", async (id) => {
    try {
        const response = await getPaymentReceiptDetailsApi(id);
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewPaymentReceipt = createAsyncThunk("paymentReceipt/addNewPaymentReceipt", async (data) => {
    try {
        const response = await addNewPaymentReceiptApi(data);
        return response;
    } catch (error) {
        return error;
    }
});

export const updatePaymentReceipt = createAsyncThunk("paymentReceipt/updatePaymentReceipt", async (data) => {
    try {
        const response = await updatePaymentReceiptApi(data);
        return response;
    } catch (error) {
        return error;
    }
});

export const deletePaymentReceipt = createAsyncThunk("paymentReceipt/deletePaymentReceipt", async (id) => {
    try {
        const response = await deletePaymentReceiptApi(id);
        return { id, ...response };
    } catch (error) {
        return error;
    }
});

export const getPendingInvoices = createAsyncThunk("paymentReceipt/getPendingInvoices", async ({ partyId, trnType }) => {
    try {
        const response = await getPendingInvoicesApi(partyId, trnType);
        return response;
    } catch (error) {
        return error;
    }
});
