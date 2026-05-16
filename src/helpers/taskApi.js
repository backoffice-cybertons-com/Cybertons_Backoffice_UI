import { APIClient } from "./api_helper";
import * as url from "./url_helper";

const api = new APIClient();

// Get all tasks
export const getTasks = (companyId) =>
    api.get(url.GET_CALENDAR_TASKS, { companyId });


// Get task by ID
export const getTaskById = (companyId, id) =>
    api.get(`${url.GET_CALENDAR_TASKS}/${id}`, { companyId });

// Add new task
export const addTask = (companyId, data) =>
    api.create(
        `${url.ADD_CALENDAR_TASK}?companyId=${companyId}`,
        data
    );

// Update task
export const updateTask = (companyId, data, updateType = "this") =>
    api.put(
        `${url.UPDATE_CALENDAR_TASK}?companyId=${companyId}&updateType=${updateType}`,
        data
    );
// Delete task
export const deleteTask = (companyId, id, deleteType = "this") =>
    api.delete(
        `${url.DELETE_CALENDAR_TASK}/${id}?companyId=${companyId}&deleteType=${deleteType}`
    );
// Get all users
export const getUsers = (companyId) =>
    api.get(url.GET_USERS, { companyId });

// Generic Master API
export const getMaster = (masterName, companyId) =>
    api.get(`/api/Master/${masterName}`, { companyId });

// // Task Template API

// Task Template API

export const getTemplates = (companyId) =>
    api.get(`${url.GET_TASK_TEMPLATES}?companyId=${companyId}`);

export const addTemplate = (companyId, data) =>
    api.create(
        `${url.ADD_TASK_TEMPLATE}?companyId=${companyId}`,
        data
    );

export const deleteTemplate = (companyId, id) =>
    api.delete(
        `${url.DELETE_TASK_TEMPLATE}/${id}?companyId=${companyId}`
    );
// export const getTemplates = () => api.get(url.GET_TASK_TEMPLATES);
// export const addTemplate = (data) => api.create(url.ADD_TASK_TEMPLATE, data);
// export const deleteTemplate = (id) => api.delete(`${url.DELETE_TASK_TEMPLATE}/${id}`);

