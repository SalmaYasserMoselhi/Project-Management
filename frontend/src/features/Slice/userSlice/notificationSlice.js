

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunk for fetching notifications
export const fetchNotifications = createAsyncThunk(
  "notification/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/v1/notifications", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return rejectWithValue("Unauthorized");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch notifications");
      }

      const data = await response.json();
      return data.data?.notifications || [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      if (
        error.message.includes("logged in") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("jwt")
      ) {
        window.location.href = "/login";
      }
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for marking all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
  "notification/markAllAsRead",
  async (_, { rejectWithValue, dispatch }) => {
    dispatch({
      type: "notification/markAllAsRead/pending",
      payload: { optimistic: true },
    });
    try {
      const response = await fetch("/api/v1/notifications/mark-read", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return rejectWithValue("Unauthorized");
        }
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to mark notifications as read"
        );
      }

      return true;
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      if (
        error.message.includes("logged in") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("jwt")
      ) {
        window.location.href = "/login";
      }
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for deleting a notification
export const deleteNotification = createAsyncThunk(
  "notification/deleteNotification",
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return rejectWithValue("Unauthorized");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete notification");
      }

      return notificationId;
    } catch (error) {
      console.error("Error deleting notification:", error);
      if (
        error.message.includes("logged in") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("jwt")
      ) {
        window.location.href = "/login";
      }
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  notifications: [],
  loading: false,
  error: null,
  showPopup: false,
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    togglePopup: (state) => {
      state.showPopup = !state.showPopup;
    },
    closePopup: (state) => {
      state.showPopup = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((notif) => !notif.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark All As Read
      .addCase("notification/markAllAsRead/pending", (state, action) => {
        if (action.payload?.optimistic) {
          state.notifications = state.notifications.map((notif) => ({
            ...notif,
            isRead: true,
          }));
          state.unreadCount = 0;
        }
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((notif) => ({
          ...notif,
          isRead: true,
        }));
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete Notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(
          (notif) => notif._id !== action.payload
        );
        state.unreadCount = state.notifications.filter((notif) => !notif.isRead).length;
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { togglePopup, closePopup, clearError } = notificationSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notification.notifications;
export const selectNotificationLoading = (state) => state.notification.loading;
export const selectNotificationError = (state) => state.notification.error;
export const selectShowNotificationPopup = (state) => state.notification.showPopup;
export const selectUnreadCount = (state) =>
  state.notification.notifications.filter((notif) => !notif.isRead).length;

export default notificationSlice.reducer;