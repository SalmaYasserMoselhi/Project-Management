// features/dashboard/dashboardSlice.js
import { createSlice } from "@reduxjs/toolkit";
import {
  fetchHighPriorityTasks,
  fetchCalendarDeadlines,
  fetchActivityLog,
  fetchTaskStats,
} from "./dashboardActions";

const initialState = {
  highPriorityTasks: [],
  deadlines: [],
  activityLog: [],
  taskStats: null,
  selectedDate: new Date().toISOString().split("T")[0],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    resetHighPriorityTasks: (state) => {
      state.highPriorityTasks = [];
    },
    resetActivityLog: (state) => {
      state.activityLog = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // High Priority Tasks
      .addCase(fetchHighPriorityTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHighPriorityTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.highPriorityTasks = action.payload.tasks;
      })
      .addCase(fetchHighPriorityTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Calendar Deadlines
      .addCase(fetchCalendarDeadlines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCalendarDeadlines.fulfilled, (state, action) => {
        state.loading = false;
        state.deadlines = action.payload.deadlines;
      })
      .addCase(fetchCalendarDeadlines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Activity Log
      .addCase(fetchActivityLog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLog.fulfilled, (state, action) => {
        state.loading = false;
        state.activityLog = action.payload.activities;
      })
      .addCase(fetchActivityLog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Task Stats
      .addCase(fetchTaskStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskStats.fulfilled, (state, action) => {
        state.loading = false;
        state.taskStats = action.payload;
      })
      .addCase(fetchTaskStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedDate, resetHighPriorityTasks, resetActivityLog } =
  dashboardSlice.actions;
export default dashboardSlice.reducer;
