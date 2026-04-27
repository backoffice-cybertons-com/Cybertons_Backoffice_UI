import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

//Include Both Helper File with needed methods
import {
    getDeliveryChallansDetailed as getDeliveryChallansApi,
    addNewDeliveryChallan as addNewDeliveryChallanApi,
    updateDeliveryChallan as updateDeliveryChallanApi,
    deleteDeliveryChallan as deleteDeliveryChallanApi,
    getDeliveryChallanDetails as getDeliveryChallanDetailsApi
} from "../../helpers/fakebackend_helper";

export const getDeliveryChallans = createAsyncThunk("deliveryChallan/getDeliveryChallans", async () => {
    try {
        const response = await getDeliveryChallansApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewDeliveryChallan = createAsyncThunk("deliveryChallan/addNewDeliveryChallan", async (challan) => {
    try {
        const response = await addNewDeliveryChallanApi(challan);
        toast.success("Delivery Challan Added Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        toast.error(error.message || "Delivery Challan Addition Failed", { autoClose: 3000 });
        return error;
    }
});

export const updateDeliveryChallan = createAsyncThunk("deliveryChallan/updateDeliveryChallan", async (challan) => {
    try {
        const response = await updateDeliveryChallanApi(challan);
        toast.success("Delivery Challan Updated Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        toast.error("Delivery Challan Update Failed", { autoClose: 3000 });
        return error;
    }
});

export const deleteDeliveryChallan = createAsyncThunk("deliveryChallan/deleteDeliveryChallan", async (id) => {
    try {
        const response = await deleteDeliveryChallanApi(id);
        toast.success("Delivery Challan Deleted Successfully", { autoClose: 3000 });
        return { id, ...response };
    }
    catch (error) {
        toast.error("Delivery Challan Deletion Failed", { autoClose: 3000 });
        return error;
    }
});

export const getDeliveryChallanDetails = createAsyncThunk("deliveryChallan/getDeliveryChallanDetails", async (id) => {
    try {
        const response = await getDeliveryChallanDetailsApi(id);
        return response;
    } catch (error) {
        return error;
    }
});
