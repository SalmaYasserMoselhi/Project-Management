import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { format, addHours } from "date-fns";
import { addMeeting, updateMeeting, removeMeeting } from "./meetingsSlice";

// Async thunk to save meeting data
export const saveMeetingData = createAsyncThunk(
  "meetingModal/saveMeetingData",
  async (boardId, { getState, dispatch }) => {
    const { meetingData } = getState().meetingModal;

    // Format the date string as expected by the API (YYYY-MM-DD)
    const formattedDate = format(
      meetingData.startDate,
      "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
    );

    // Format the time strings for API
    const formattedStartTime = format(meetingData.startTime, "HH:mm");
    const formattedEndTime = format(meetingData.endTime, "HH:mm");

    // Format the data according to API requirements (without attendees)
    const apiData = {
      name: meetingData.meetingName,
      date: formattedDate,
      time: {
        startTime: formattedStartTime,
        endTime: formattedEndTime,
      },
      onlineLink: meetingData.link,
      color: meetingData.color,
      board: boardId,
    };

    // Step 1: Create the meeting
    const response = await axios.post(`/api/v1/meetings`, apiData);
    const createdMeeting = response.data.data.meeting;

    // Step 2: Add attendees if any (excluding the creator who is already added)
    if (meetingData.invitees && meetingData.invitees.length > 0) {
      const attendeeIds = meetingData.invitees
        .map((invitee) => (invitee.user && invitee.user._id) || invitee._id)
        .filter(Boolean); // Remove any undefined/null values

      if (attendeeIds.length > 0) {
        try {
          await axios.post(`/api/v1/meetings/${createdMeeting._id}/attendees`, {
            attendees: attendeeIds,
          });

          // Fetch the updated meeting with attendees
          const updatedResponse = await axios.get(
            `/api/v1/meetings/${createdMeeting._id}`
          );
          dispatch(addMeeting(updatedResponse.data.data.meeting));
        } catch (attendeeError) {
          console.error("Failed to add attendees:", attendeeError);
          // Still add the meeting even if attendees fail
          dispatch(addMeeting(createdMeeting));
        }
      } else {
        dispatch(addMeeting(createdMeeting));
      }
    } else {
      dispatch(addMeeting(createdMeeting));
    }

    return response.data;
  }
);

// Async thunk to delete meeting data
export const deleteMeetingData = createAsyncThunk(
  "meetingModal/deleteMeetingData",
  async (meetingId, { dispatch }) => {
    // Delete the meeting
    await axios.delete(`/api/v1/meetings/${meetingId}`);

    // Remove from meetings list
    dispatch(removeMeeting(meetingId));

    return meetingId;
  }
);

// Async thunk to update meeting data
export const updateMeetingData = createAsyncThunk(
  "meetingModal/updateMeetingData",
  async (meetingId, { getState, dispatch }) => {
    const { meetingData } = getState().meetingModal;
    const { meetings } = getState().meetings;

    // Get the current meeting data to compare attendees
    const currentMeeting = meetings.find(
      (meeting) => meeting._id === meetingId
    );

    // Format the date string as expected by the API (YYYY-MM-DD)
    const formattedDate = format(
      meetingData.startDate,
      "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
    );

    // Format the time strings for API
    const formattedStartTime = format(meetingData.startTime, "HH:mm");
    const formattedEndTime = format(meetingData.endTime, "HH:mm");

    // Step 1: Update basic meeting details
    const apiData = {
      name: meetingData.meetingName,
      date: formattedDate,
      time: {
        startTime: formattedStartTime,
        endTime: formattedEndTime,
      },
      onlineLink: meetingData.link,
      color: meetingData.color,
    };

    const response = await axios.patch(
      `/api/v1/meetings/${meetingId}`,
      apiData
    );

    // Step 2: Handle attendee changes if we have current meeting data
    if (currentMeeting) {
      const currentAttendeeIds =
        currentMeeting.attendees?.map(
          (attendee) => attendee.user?._id || attendee.user
        ) || [];

      const newAttendeeIds =
        meetingData.invitees
          ?.map((invitee) => (invitee.user && invitee.user._id) || invitee._id)
          .filter(Boolean) || [];

      // Find attendees to add (in new but not in current)
      const attendeesToAdd = newAttendeeIds.filter(
        (id) => !currentAttendeeIds.includes(id)
      );

      // Find attendees to remove (in current but not in new, excluding creator)
      const attendeesToRemove = currentAttendeeIds.filter(
        (id) =>
          !newAttendeeIds.includes(id) && id !== currentMeeting.createdBy._id
      );

      // Add new attendees
      if (attendeesToAdd.length > 0) {
        try {
          await axios.post(`/api/v1/meetings/${meetingId}/attendees`, {
            attendees: attendeesToAdd,
          });
        } catch (error) {
          console.error("Failed to add attendees:", error);
        }
      }

      // Remove attendees
      for (const attendeeId of attendeesToRemove) {
        try {
          await axios.delete(
            `/api/v1/meetings/${meetingId}/attendees/${attendeeId}`
          );
        } catch (error) {
          console.error(`Failed to remove attendee ${attendeeId}:`, error);
        }
      }
    }

    // Step 3: Fetch the updated meeting with all attendees
    try {
      const updatedResponse = await axios.get(`/api/v1/meetings/${meetingId}`);
      dispatch(updateMeeting(updatedResponse.data.data.meeting));
    } catch (error) {
      console.error("Failed to fetch updated meeting:", error);
      // Fallback to the basic update response
      if (response.data.data && response.data.data.meeting) {
        dispatch(updateMeeting(response.data.data.meeting));
      }
    }

    return response.data;
  }
);

const meetingModalSlice = createSlice({
  name: "meetingModal",
  initialState: {
    isOpen: false,
    isEditing: false, // New field to track if we're editing an existing meeting
    editingMeetingId: null, // Store the ID of the meeting being edited
    meetingData: {
      meetingName: "",
      startDate: new Date(),
      startTime: new Date(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      link: "",
      invitees: [],
      color: "#4D2D61", // Add color field with default value
    },
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    openMeetingModal: (state) => {
      state.isOpen = true;
      state.isEditing = false;
      state.editingMeetingId = null;
      // Ensure startTime is current time and endTime is an hour later when opening modal
      const now = new Date();
      state.meetingData.startTime = now;
      state.meetingData.endTime = addHours(now, 1);
    },
    openMeetingModalForEdit: (state, action) => {
      state.isOpen = true;
      state.isEditing = true;
      state.editingMeetingId = action.payload;
    },
    closeMeetingModal: (state) => {
      state.isOpen = false;
      state.isEditing = false;
      state.editingMeetingId = null;
    },
    updateMeetingName: (state, action) => {
      state.meetingData.meetingName = action.payload;
    },
    updateMeetingDate: (state, action) => {
      state.meetingData.startDate = action.payload;
    },
    updateStartTime: (state, action) => {
      state.meetingData.startTime = action.payload;
      // Automatically update end time to be 1 hour after start time
      state.meetingData.endTime = addHours(action.payload, 1);
    },
    updateEndTime: (state, action) => {
      state.meetingData.endTime = action.payload;
    },
    updateLink: (state, action) => {
      state.meetingData.link = action.payload;
    },
    updateInvitees: (state, action) => {
      state.meetingData.invitees = action.payload;
      console.log("Updated invitees in Redux:", action.payload);
    },
    updateColor: (state, action) => {
      state.meetingData.color = action.payload;
    },
    resetMeetingData: (state) => {
      const now = new Date();
      state.meetingData = {
        meetingName: "",
        startDate: now,
        startTime: now,
        endTime: addHours(now, 1),
        link: "",
        invitees: [],
        color: "#4D2D61", // Reset color to default
      };
      state.status = "idle";
      state.error = null;
      state.isEditing = false;
      state.editingMeetingId = null;
    },
    // We'll add more actions for updating meeting data later
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveMeetingData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(saveMeetingData.fulfilled, (state, action) => {
        state.status = "succeeded";
      })
      .addCase(saveMeetingData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Update meeting data
      .addCase(updateMeetingData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateMeetingData.fulfilled, (state, action) => {
        state.status = "succeeded";
      })
      .addCase(updateMeetingData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Delete meeting data
      .addCase(deleteMeetingData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteMeetingData.fulfilled, (state, action) => {
        state.status = "succeeded";
      })
      .addCase(deleteMeetingData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const {
  openMeetingModal,
  openMeetingModalForEdit,
  closeMeetingModal,
  updateMeetingName,
  updateMeetingDate,
  updateStartTime,
  updateEndTime,
  updateLink,
  updateInvitees,
  updateColor,
  resetMeetingData,
} = meetingModalSlice.actions;

export default meetingModalSlice.reducer;
