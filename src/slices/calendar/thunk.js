import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import moment from "moment";
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  getUsers as getUsersApi,
  getTemplates as getTemplatesApi,
  addTemplate as addTemplateApi,
  deleteTemplate as deleteTemplateApi,
} from "../../helpers/taskApi";


// Mapping Helpers
// Status and Priority are now stored as direct strings: Pending, Completed, Canceled, Low, Medium, High, Urgent

const transformTaskToEvent = (task) => {
  const start = moment(task.assigned_date || task.assignedDate);
  const end = moment(task.expected_date || task.expectedDate);
  const isAllDay = start.format("HH:mm:ss") === "00:00:00" &&
    end.format("HH:mm:ss") === "23:59:59";

  return {
    id: task.task_id || task.taskId,
    title: task.title,
    start: task.assigned_date || task.assignedDate,
    end: task.expected_date || task.expectedDate,
    allDay: isAllDay,
    description: task.description,
    status: task.task_status || task.taskStatus || "Pending",
    priority: task.priority || "Medium",
    category: (task.task_category_id || task.taskCategoryId) ? categoryReverseMap[task.task_category_id || task.taskCategoryId] : "bg-info-subtle",
    className: (task.task_category_id || task.taskCategoryId) ? categoryReverseMap[task.task_category_id || task.taskCategoryId] : "bg-info-subtle",
    assignedUserId: task.assigned_user_id || task.assignedUserId || null,
    reminder: task.reminder || false,
    reminderDate: task.reminder_date || task.reminderDate || null,
    finishDate: task.finish_date || task.finishDate || null,
  };
};

const categoryReverseMap = {
  1: "bg-primary-subtle",
  2: "bg-success-subtle",
  3: "bg-info-subtle",
  4: "bg-warning-subtle",
  5: "bg-danger-subtle",
};

const categoryMap = {
  "bg-primary-subtle": 1,
  "bg-success-subtle": 2,
  "bg-info-subtle": 3,
  "bg-warning-subtle": 4,
  "bg-danger-subtle": 5,
};

const transformEventToTask = (event) => {
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userId = authUser.id || 1;

  return {
    task_id: event.id && !isNaN(event.id) ? parseInt(event.id) : 0,
    title: event.title,
    description: event.description || "",
    assigned_date: moment(event.start).format("YYYY-MM-DDTHH:mm:ss"),
    expected_date: moment(event.end || event.start).format("YYYY-MM-DDTHH:mm:ss"),
    task_status: event.status || "Pending",
    priority: event.priority || "Medium",
    task_category_id: categoryMap[event.category] || 3,
    initiated_user_id: userId,
    assigned_user_id: event.assignedUserId || null,
    reminder: event.reminder || false,
    reminder_date: event.reminderDate ? moment(event.reminderDate).format("YYYY-MM-DDTHH:mm:ss") : null,
    finish_date: event.finishDate ? moment(event.finishDate).format("YYYY-MM-DDTHH:mm:ss") : null,
    is_deleted: false,
  };
};

export const getEvents = createAsyncThunk("calendar/getEvents", async (companyId, { rejectWithValue }) => {
  try {
    const response = await getTasks(companyId);
    return (response || []).map(transformTaskToEvent);
  } catch (error) {
    console.error("API Error [getTasks]:", error);
    return rejectWithValue(error);
  }
});

export const getUsers = createAsyncThunk("calendar/getUsers", async (companyId, { rejectWithValue }) => {
  try {
    const response = await getUsersApi(companyId);
    return (response || []).map(u => ({
      userId: u.UserId || u.userId,
      fullName: u.FullName || u.fullName
    }));
  } catch (error) {
    console.error("API Error [getUsers]:", error);
    return rejectWithValue(error);
  }
});

export const addNewEvent = createAsyncThunk("calendar/addNewEvent", async (event, { rejectWithValue }) => {
  try {
    debugger;
    const taskData = transformEventToTask(event);
    console.log("Adding Task [Payload]:", JSON.stringify(taskData, null, 2));
    const companyId = localStorage.getItem("companyId");
    const response = await addTask(companyId, taskData);
    //const response = await addTask(taskData);
    const newTaskId = response.task_id || response.taskId;
    if (response && newTaskId) {
      toast.success("Task Created Successfully", { autoClose: 3000 });
      return transformTaskToEvent({ ...taskData, task_id: newTaskId, taskId: newTaskId });
    }
    return event;
  } catch (error) {
    console.error("API Error [addTask]:", error);
    toast.error("Failed To Save Task", { autoClose: 3000 });
    return rejectWithValue(error);
  }
});

export const updateEvent = createAsyncThunk("calendar/updateEvent", async (event, { rejectWithValue }) => {
  try {
    const taskData = transformEventToTask(event);
    console.log("Updating Task [Payload]:", JSON.stringify(taskData, null, 2));
    const companyId = JSON.parse(localStorage.getItem("companyId") || "{}");

    await updateTask(companyId, taskData);
    //await updateTask(taskData);
    toast.success("Task Updated Successfully", { autoClose: 3000 });
    return event;
  } catch (error) {
    console.error("API Error [updateTask]:", error);
    toast.error("Failed To Save Task", { autoClose: 3000 });
    return rejectWithValue(error);
  }
});

export const deleteEvent = createAsyncThunk("calendar/deleteEvent", async (taskId, { rejectWithValue }) => {
  try {
    const companyId = JSON.parse(localStorage.getItem("companyId") || "{}");

    await deleteTask(companyId, taskId);
    //   await deleteTask(taskId);
    toast.success("Task deleted successfully", { autoClose: 3000 });
    return taskId;
  } catch (error) {
    console.error("API Error [deleteTask]:", error);
    toast.error("Failed to delete task", { autoClose: 3000 });
    return rejectWithValue(error);
  }
});

export const getCategories = createAsyncThunk("calendar/getCategories", async (_, { rejectWithValue }) => {
  try {
    // Return dummy categories if not available in backend yet
    return [
      { id: 1, title: "Work", type: "bg-primary-subtle" },
      { id: 2, title: "Personal", type: "bg-success-subtle" },
    ];
  } catch (error) {
    console.error("API Error [getCategories]:", error);
    return rejectWithValue(error);
  }
});

export const getUpCommingEvent = createAsyncThunk("calendar/getUpCommingEvent", async (companyId, { rejectWithValue }) => {
  try {
    const response = await getTasks(companyId);
    return (response || [])
      .filter(t => new Date(t.expectedDate) >= new Date())
      .map(transformTaskToEvent);
  } catch (error) {
    console.error("API Error [getUpCommingEvent]:", error);
    return rejectWithValue(error);
  }
});

export const resetCalendar = createAsyncThunk("calendar/resetCalendar", async (_, { rejectWithValue }) => {
  try {
    return "";
  } catch (error) {
    return rejectWithValue(error);
  }
});

// Template Thunks
export const getTemplates = createAsyncThunk("calendar/getTemplates", async (_, { rejectWithValue }) => {
  try {
    // const response = await getTemplatesApi();
    const companyId = localStorage.getItem("companyId");

    const response = await getTemplatesApi(companyId);
    return response || [];
  } catch (error) {
    console.error("API Error [getTemplates]:", error);
    return rejectWithValue(error);
  }
});

export const addNewTemplate = createAsyncThunk("calendar/addNewTemplate", async (template, { rejectWithValue }) => {
  try {
    //const response = await addTemplateApi(template);
    const companyId = localStorage.getItem("companyId");

    const response = await addTemplateApi(companyId, template);
    if (response && (response.template_id || response.templateId)) {
      toast.success("Template Created Successfully", { autoClose: 3000 });
      return { ...template, template_id: response.template_id || response.templateId };
    }
    return template;
  } catch (error) {
    console.error("API Error [addTemplate]:", error);
    toast.error("Failed To Create Template", { autoClose: 3000 });
    return rejectWithValue(error);
  }
});

export const deleteTemplate = createAsyncThunk("calendar/deleteTemplate", async (templateId, { rejectWithValue }) => {
  try {
    // await deleteTemplateApi(templateId);
    const companyId = localStorage.getItem("companyId");

    await deleteTemplateApi(companyId, templateId);
    toast.success("Template deleted successfully", { autoClose: 3000 });
    return templateId;
  } catch (error) {
    console.error("API Error [deleteTemplate]:", error);
    toast.error("Failed to delete template", { autoClose: 3000 });
    return rejectWithValue(error);
  }
});

