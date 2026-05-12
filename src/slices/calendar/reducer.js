import { createSlice } from "@reduxjs/toolkit";
import { 
  getEvents, 
  addNewEvent, 
  updateEvent, 
  deleteEvent, 
  getCategories, 
  getUpCommingEvent, 
  getUsers,
  getTemplates,
  addNewTemplate,
  deleteTemplate,
  resetCalendar 
} from './thunk';


export const initialState = {
  events: [],
  categories: [],
  upcommingevents: [],
  users: [],
  templates: [],
  isEventUpdated: false,
  loading: false,
  error: {}
};


const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // GET EVENTS
    builder.addCase(getEvents.pending, (state) => {
      state.loading = true;
      state.isEventUpdated = false;
    });
    builder.addCase(getEvents.fulfilled, (state, action) => {
      state.events = action.payload;
      state.loading = false;
    });
    builder.addCase(getEvents.rejected, (state, action) => {
      state.error = action.payload || null;
      state.loading = false;
    });

    // ADD EVENT
    builder.addCase(addNewEvent.pending, (state) => {
      state.loading = true;
      state.isEventUpdated = false;
    });
    builder.addCase(addNewEvent.fulfilled, (state, action) => {
      state.events.unshift(action.payload);
      state.isEventUpdated = true;
      state.loading = false;
    });
    builder.addCase(addNewEvent.rejected, (state, action) => {
      state.error = action.payload || null;
      state.loading = false;
    });

    // UPDATE EVENT
    builder.addCase(updateEvent.pending, (state) => {
      state.loading = true;
      state.isEventUpdated = false;
    });
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      state.events = (state.events || []).map((event) =>
        event.id.toString() === action.payload.id.toString()
          ? { ...event, ...action.payload }
          : event
      );
      state.isEventUpdated = true;
      state.loading = false;
    });
    builder.addCase(updateEvent.rejected, (state, action) => {
      state.error = action.payload || null;
      state.loading = false;
    });

    // DELETE EVENT
    builder.addCase(deleteEvent.pending, (state) => {
      state.loading = true;
      state.isEventUpdated = false;
    });
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.events = state.events.filter(
        (event) => event.id.toString() !== action.payload.toString()
      );
      state.isEventUpdated = true;
      state.loading = false;
    });
    builder.addCase(deleteEvent.rejected, (state, action) => {
      state.error = action.payload || null;
      state.loading = false;
    });

    builder.addCase(getCategories.fulfilled, (state, action) => {
      state.categories = action.payload;
    });

    builder.addCase(getUpCommingEvent.fulfilled, (state, action) => {
      state.upcommingevents = action.payload;
    });

    builder.addCase(resetCalendar.fulfilled, (state) => {
      state.isEventUpdated = false;
    });
    
    builder.addCase(getUsers.fulfilled, (state, action) => {
      state.users = action.payload;
    });

    builder.addCase(getUsers.rejected, (state, action) => {
      state.error = action.payload || null;
    });

    // TEMPLATES
    builder.addCase(getTemplates.fulfilled, (state, action) => {
      state.templates = action.payload;
    });
    builder.addCase(addNewTemplate.fulfilled, (state, action) => {
      state.templates.unshift(action.payload);
    });
    builder.addCase(deleteTemplate.fulfilled, (state, action) => {
      state.templates = state.templates.filter(
        (template) => (template.template_id || template.templateId).toString() !== action.payload.toString()
      );
    });
  },
});


export default calendarSlice.reducer;
