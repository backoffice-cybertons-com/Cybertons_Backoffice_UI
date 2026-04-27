import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

//Include Both Helper File with needed methods
import {
    getPurchaseTransactions as getPurchaseTransactionsApi,
    addNewPurchaseTransaction as addNewPurchaseTransactionApi,
    updatePurchaseTransaction as updatePurchaseTransactionApi,
    deletePurchaseTransaction as deletePurchaseTransactionApi,
    getPurchaseTransactionDetails as getPurchaseTransactionDetailsApi
} from "../../helpers/fakebackend_helper";

export const getPurchaseTransactions = createAsyncThunk("purchaseTransaction/getPurchaseTransactions", async () => {
    try {
        const response = await getPurchaseTransactionsApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewPurchaseTransaction = createAsyncThunk("purchaseTransaction/addNewPurchaseTransaction", async (purchaseTransaction) => {
    try {
        const response = await addNewPurchaseTransactionApi(purchaseTransaction);
        toast.success("Purchase Transaction Added Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        console.error("Add New Purchase Transaction Error:", error);
        toast.error(error || "Purchase Transaction Addition Failed", { autoClose: 3000 });
        return error;
    }
});

export const updatePurchaseTransaction = createAsyncThunk("purchaseTransaction/updatePurchaseTransaction", async (purchaseTransaction) => {
    try {
        const response = await updatePurchaseTransactionApi(purchaseTransaction);
        toast.success("Purchase Transaction Updated Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        toast.error("Purchase Transaction Update Failed", { autoClose: 3000 });
        return error;
    }
});

export const deletePurchaseTransaction = createAsyncThunk("purchaseTransaction/deletePurchaseTransaction", async (id) => {
    try {
        const response = await deletePurchaseTransactionApi(id);
        toast.success("Purchase Transaction Deleted Successfully", { autoClose: 3000 });
        return { id, ...response };
    }
    catch (error) {
        toast.error("Purchase Transaction Deletion Failed", { autoClose: 3000 });
        return error;
    }
});

export const getPurchaseTransactionDetails = createAsyncThunk("purchaseTransaction/getPurchaseTransactionDetails", async (id) => {
    try {
        const response = await getPurchaseTransactionDetailsApi(id);
        return response;
    } catch (error) {
        return error;
    }
});
