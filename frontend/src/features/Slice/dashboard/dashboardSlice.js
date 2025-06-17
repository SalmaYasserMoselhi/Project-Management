// features/dashboard/dashboardSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchHighPriorityTasks,
  fetchCalendarDeadlines,
  fetchActivityLog,
  fetchTaskStats
} from './dashboardActions';

const initialState = {
  highPriorityTasks: [],
  highPriorityTasksPagination: {
    currentPage: 1,
    totalPages: 1,
    results: 0
  },
  deadlines: [],
  activityLog: [],
  activityLogPagination: {
    currentPage: 1,
    totalPages: 1,
    results: 0
  },
  taskStats: null,
  selectedDate: new Date().toISOString().split('T')[0],
  loading: false,
  error: null
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    resetHighPriorityTasks: (state) => {
      state.highPriorityTasks = [];
      state.highPriorityTasksPagination = {
        currentPage: 1,
        totalPages: 1,
        results: 0
      };
    },
    resetActivityLog: (state) => {
      state.activityLog = [];
      state.activityLogPagination = {
        currentPage: 1,
        totalPages: 1,
        results: 0
      };
    }
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
        if (action.meta.arg?.page === 1) {
          // If it's page 1, replace the tasks
          state.highPriorityTasks = action.payload.tasks;
        } else {
          // If it's subsequent pages, append to existing tasks
          state.highPriorityTasks = [...state.highPriorityTasks, ...action.payload.tasks];
        }
        state.highPriorityTasksPagination = action.payload.pagination;
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
        if (action.meta.arg?.page === 1) {
          // If it's page 1, replace the activities
          state.activityLog = action.payload.activities;
        } else {
          // If it's subsequent pages, append to existing activities
          state.activityLog = [...state.activityLog, ...action.payload.activities];
        }
        state.activityLogPagination = action.payload.pagination;
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
  }
});

export const { setSelectedDate, resetHighPriorityTasks, resetActivityLog } = dashboardSlice.actions;
export default dashboardSlice.reducer;