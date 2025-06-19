// features/dashboard/dashboardActions.js
import axios from "../../../utils/axiosConfig";
import { createAsyncThunk } from "@reduxjs/toolkit";

// Fetch high priority tasks
export const fetchHighPriorityTasks = createAsyncThunk(
  "dashboard/fetchHighPriorityTasks",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/api/v1/dashboard/high-priority-tasks");
      return {
        tasks: response.data.data.tasks,
        results: response.data.results,
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch calendar deadlines
export const fetchCalendarDeadlines = createAsyncThunk(
  "dashboard/fetchCalendarDeadlines",
  async (date, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `/api/v1/dashboard/calendar-deadlines?date=${date}`
      );
      return {
        date,
        deadlines: response.data.data.deadlines,
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch activity log
export const fetchActivityLog = createAsyncThunk(
  "dashboard/fetchActivityLog",
  async (
    { sortBy = "createdAt", sortOrder = "desc" } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.get(
        `/api/v1/dashboard/activity-log?sortBy=${sortBy}&sortOrder=${sortOrder}`
      );
      return {
        activities: response.data.data.activities,
        results: response.data.results,
        sortBy: response.data.sortBy,
        sortOrder: response.data.sortOrder,
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch task statistics
export const fetchTaskStats = createAsyncThunk(
  "dashboard/fetchTaskStats",
  async (period = "weekly", { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `/api/v1/dashboard/task-stats?period=${period}`
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
