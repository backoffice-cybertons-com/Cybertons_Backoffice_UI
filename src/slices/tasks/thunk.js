import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

//Include Both Helper File with needed methods
import {
    getTaskList as getTaskListApi,
    addNewTask as addNewTaskApi,
    updateTask as updateTaskApi,
    deleteTask as deleteTaskApi,
    getTasks as getTasksApi,
    addNewTasks as addNewTasksApi,
    updateTasks as updateTasksApi,
    deleteTasks as deleteTasksApi,
    deleteKanbanColumn as deleteKanbanColumnApi,
    getKanbanBoards as getKanbanBoardsApi,
    createKanbanBoard as createKanbanBoardApi,
} from "../../helpers/fakebackend_helper";

// ── Task List (non-kanban) ────────────────────────────────────────────────────

export const getTaskList = createAsyncThunk("tasks/getTaskList", async () => {
    try {
        const response = await getTaskListApi();
        console.log(response);
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewTask = createAsyncThunk("tasks/addNewTask", async (task) => {
    try {
        const response = await addNewTaskApi(task);
        toast.success("Task Added Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        toast.error("Task Added Failed", { autoClose: 3000 });
        return error;
    }
});

export const updateTask = createAsyncThunk("tasks/updateTask", async (task) => {
    try {
        const response = await updateTaskApi(task);
        toast.success("Task Updated Successfully", { autoClose: 3000 });
        return response;
    } catch (error) {
        toast.error("Task Updated Failed", { autoClose: 3000 });
        return error;
    }
});

export const deleteTask = createAsyncThunk("tasks/deleteTask", async (task) => {
    try {
        const response = await deleteTaskApi(task);
        toast.success("Task Updated Successfully", { autoClose: 3000 });
        return { task, ...response };
    } catch (error) {
        toast.error("Task Updated Failed", { autoClose: 3000 });
        return error;
    }
});

// ── Kanban Boards ─────────────────────────────────────────────────────────────

/** Fetch all boards for the current user. Reducer auto-selects the default one. */
export const getBoards = createAsyncThunk("tasks/getBoards", async () => {
    try {
        const response = await getKanbanBoardsApi();
        return Array.isArray(response) ? response : [];
    } catch (error) {
        return [];
    }
});

/** Create a new board. Payload: string boardName */
export const createBoard = createAsyncThunk("tasks/createBoard", async (boardName) => {
    try {
        const response = await createKanbanBoardApi({ boardName });
        toast.success("Board created successfully", { autoClose: 2000 });
        return response;
    } catch (error) {
        toast.error("Board creation failed", { autoClose: 2000 });
        return error;
    }
});

// ── Kanban Columns & Cards ────────────────────────────────────────────────────

/** Load columns (with nested cards) for the given boardId */
export const getTasks = createAsyncThunk("tasks/getTasks", async (boardId) => {
    try {
        const response = await getTasksApi(boardId);
        return response;
    } catch (error) {
        return error;
    }
});

/** Add a column OR a card. Payload: { card, boardId } */
export const addCardData = createAsyncThunk("tasks/addCardData", async ({ card, boardId }) => {
    try {
        const response = await addNewTasksApi(card, boardId);
        const data = await response;
        toast.success("Card Add Successfully", { autoClose: 2000 });
        return data;
    } catch (error) {
        toast.error("Card Add Failed", { autoClose: 2000 });
        return error;
    }
});

/** Update a card (or move between columns). Payload: { card, boardId } */
export const updateCardData = createAsyncThunk("tasks/updateCardData", async ({ card, boardId }) => {
    try {
        const response = await updateTasksApi(card, boardId);
        const data = await response;
        toast.success("Card Update Successfully", { autoClose: 2000 });
        return data;
    } catch (error) {
        toast.error("Card Update Failed", { autoClose: 2000 });
        return error;
    }
});

/** Delete a card. Payload: { cardId, boardId } */
export const deleteKanban = createAsyncThunk("tasks/deleteKanban", async ({ cardId, boardId }) => {
    try {
        await deleteTasksApi(cardId, boardId);
        toast.success("Card Delete Successfully", { autoClose: 2000 });
        // Return the cardId string so the reducer can filter it out
        return cardId;
    } catch (error) {
        toast.error("Card Delete Failed", { autoClose: 2000 });
        return error;
    }
});

/** Delete an entire column. Payload: { columnId, boardId } */
export const deleteKanbanColumn = createAsyncThunk("tasks/deleteKanbanColumn", async ({ columnId, boardId }) => {
    try {
        const response = await deleteKanbanColumnApi(columnId, boardId);
        const data = await response;
        toast.success("Column Delete Successfully", { autoClose: 2000 });
        return data;
    } catch (error) {
        toast.error("Column Delete Failed", { autoClose: 2000 });
        return error;
    }
});
