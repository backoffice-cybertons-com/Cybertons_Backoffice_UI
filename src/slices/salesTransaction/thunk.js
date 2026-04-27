import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

//Include Both Helper File with needed methods
import {
    getSalesTransactions as getSalesTransactionsApi,
    addNewSalesTransaction as addNewSalesTransactionApi,
    updateSalesTransaction as updateSalesTransactionApi,
    deleteSalesTransaction as deleteSalesTransactionApi,
    getSalesTransactionDetails as getSalesTransactionDetailsApi
} from "../../helpers/fakebackend_helper";

export const getSalesTransactions = createAsyncThunk("SalesTransaction/getSalesTransactions", async () => {
    try {
        const response = await getSalesTransactionsApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewSalesTransaction = createAsyncThunk("SalesTransaction/addNewSalesTransaction", async (SalesTransaction) => {
    try {
        const response = await addNewSalesTransactionApi(SalesTransaction);
        toast.success("Sales Transaction Added Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        console.error("Add New Sales Transaction Error:", error);
        toast.error(error || "Sales Transaction Addition Failed", { autoClose: 3000 });
        return error;
    }
});

export const updateSalesTransaction = createAsyncThunk("SalesTransaction/updateSalesTransaction", async (SalesTransaction) => {
    try {
        const response = await updateSalesTransactionApi(SalesTransaction);
        toast.success("Sales Transaction Updated Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        toast.error("Sales Transaction Update Failed", { autoClose: 3000 });
        return error;
    }
});

export const deleteSalesTransaction = createAsyncThunk("SalesTransaction/deleteSalesTransaction", async (id) => {
    try {
        const response = await deleteSalesTransactionApi(id);
        toast.success("Sales Transaction Deleted Successfully", { autoClose: 3000 });
        return { id, ...response };
    }
    catch (error) {
        toast.error("Sales Transaction Deletion Failed", { autoClose: 3000 });
        return error;
    }
});

export const getSalesTransactionDetails = createAsyncThunk("SalesTransaction/getSalesTransactionDetails", async (id) => {
    try {
        const response = await getSalesTransactionDetailsApi(id);
        return response;
    } catch (error) {
        return error;
    }
});
