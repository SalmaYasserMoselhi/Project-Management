// features/dashboard/dashboardActions.js
import axios from '../../../utils/axiosConfig';
import { createAsyncThunk } from '@reduxjs/toolkit';

// Fetch high priority tasks with pagination
export const fetchHighPriorityTasks = createAsyncThunk(
  'dashboard/fetchHighPriorityTasks',
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/v1/dashboard/high-priority-tasks?page=${page}&limit=${limit}`);
      return {
        tasks: response.data.data.tasks,
        pagination: {
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          results: response.data.results
        }
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch calendar deadlines
export const fetchCalendarDeadlines = createAsyncThunk(
  'dashboard/fetchCalendarDeadlines',
  async (date, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/v1/dashboard/calendar-deadlines?date=${date}`);
      return {
        date,
        deadlines: response.data.data.deadlines
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch activity log with pagination
export const fetchActivityLog = createAsyncThunk(
  'dashboard/fetchActivityLog',
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/v1/dashboard/activity-log?page=${page}&limit=${limit}`);
      return {
        activities: response.data.data.activities,
        pagination: {
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          results: response.data.results
        }
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Fetch task statistics
export const fetchTaskStats = createAsyncThunk(
  'dashboard/fetchTaskStats',
  async (period = 'weekly', { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/v1/dashboard/task-stats?period=${period}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);