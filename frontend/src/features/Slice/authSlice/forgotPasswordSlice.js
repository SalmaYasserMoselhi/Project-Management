import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/v1/users/forgotPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || "Failed to send reset code");
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error.message || "Something went wrong. Please try again later."
      );
    }
  }
);

const forgotPasswordSlice = createSlice({
  name: "forgotPassword",
  initialState: {
    email: "",
    error: null,
    successMessage: null,
    loading: false,
  },
  reducers: {
    setEmail: (state, action) => {
      state.email = action.payload;
    },
    resetState: (state) => {
      state.email = "";
      state.error = null;
      state.successMessage = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;

        state.successMessage =
          action.payload.message || "Reset code has been sent to your email.";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to send reset code";
      });
  },
});

export const { setEmail, resetState } = forgotPasswordSlice.actions;
export default forgotPasswordSlice.reducer;
