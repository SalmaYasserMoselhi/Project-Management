import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Async thunk to fetch user meetings
export const fetchUserMeetings = createAsyncThunk(
  "meetings/fetchUserMeetings",
  async ({ startDate, endDate } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("limit", "100"); // Get more meetings for calendar view

    const response = await axios.get(
      `/api/v1/meetings/my-meetings${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
    return response.data.data.meetings;
  }
);

// Async thunk to fetch upcoming meetings
export const fetchUpcomingMeetings = createAsyncThunk(
  "meetings/fetchUpcomingMeetings",
  async () => {
    const response = await axios.get(`/api/v1/meetings/upcoming`);
    return response.data.data.meetings;
  }
);

const meetingsSlice = createSlice({
  name: "meetings",
  initialState: {
    meetings: [],
    upcomingMeetings: [],
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    lastFetch: null,
  },
  reducers: {
    clearMeetings: (state) => {
      state.meetings = [];
      state.upcomingMeetings = [];
      state.status = "idle";
      state.error = null;
      state.lastFetch = null;
    },
    // Action to add a new meeting after creation
    addMeeting: (state, action) => {
      state.meetings.push(action.payload);
    },
    // Action to update an existing meeting
    updateMeeting: (state, action) => {
      const index = state.meetings.findIndex(
        (meeting) => meeting._id === action.payload._id
      );
      if (index !== -1) {
        state.meetings[index] = action.payload;
      }
    },
    // Action to remove a meeting after deletion
    removeMeeting: (state, action) => {
      state.meetings = state.meetings.filter(
        (meeting) => meeting._id !== action.payload
      );
      state.upcomingMeetings = state.upcomingMeetings.filter(
        (meeting) => meeting._id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user meetings
      .addCase(fetchUserMeetings.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserMeetings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.meetings = action.payload;
        state.error = null;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUserMeetings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Fetch upcoming meetings
      .addCase(fetchUpcomingMeetings.pending, (state) => {
        // Don't change main status for upcoming meetings
        if (state.status === "idle") {
          state.status = "loading";
        }
      })
      .addCase(fetchUpcomingMeetings.fulfilled, (state, action) => {
        state.upcomingMeetings = action.payload;
        if (state.status === "loading" && state.meetings.length === 0) {
          state.status = "succeeded";
        }
      })
      .addCase(fetchUpcomingMeetings.rejected, (state, action) => {
        if (state.status === "loading" && state.meetings.length === 0) {
          state.status = "failed";
          state.error = action.error.message;
        }
      });
  },
});

export const { clearMeetings, addMeeting, updateMeeting, removeMeeting } =
  meetingsSlice.actions;

export default meetingsSlice.reducer;
