import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const verifyResetSession = createAsyncThunk(
  "resetPassword/verifyResetSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/v1/users/verifyResetSession", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(
          data.message ||
            "Invalid reset session. Please restart the password reset process."
        );
      }
      return true;
    } catch (error) {
      return rejectWithValue(
        error.message || "Session verification failed. Please try again."
      );
    }
  }
);

export const resetPasswordThunk = createAsyncThunk(
  "resetPassword/resetPassword",
  async ({ password, confirmPassword }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/v1/users/resetPassword", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password,
          passwordConfirm: confirmPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.message || "Password reset failed");
      }
      return data.message;
    } catch (error) {
      return rejectWithValue(
        error.message || "Password reset failed. Please try again."
      );
    }
  }
);

const resetPasswordSlice = createSlice({
  name: "resetPassword",
  initialState: {
    password: "",
    confirmPassword: "",
    passwordError: "",
    confirmPasswordError: "",
    isFormValid: false,
    error: "",
    loading: false,
    successMessage: "",
    verifyLoading: false,
    verifyError: "",
  },
  reducers: {
    setPassword: (state, action) => {
      state.password = action.payload;
    },
    setConfirmPassword: (state, action) => {
      state.confirmPassword = action.payload;
    },
    validatePassword: (state) => {
      if (state.password.length < 8 || !/\d/.test(state.password)) {
        state.passwordError =
          "Password must be at least 8 characters long and contain both letters and numbers.";
        state.isFormValid = false;
      } else {
        state.passwordError = "";
      }
    },
    validateConfirmPassword: (state) => {
      if (state.confirmPassword !== state.password) {
        state.confirmPasswordError = "Passwords do not match";
        state.isFormValid = false;
      } else {
        state.confirmPasswordError = "";
      }
    },
    validateForm: (state) => {
      if (
        state.password.length >= 8 &&
        /\d/.test(state.password) &&
        state.confirmPassword === state.password &&
        !state.passwordError &&
        !state.confirmPasswordError
      ) {
        state.isFormValid = true;
      } else {
        state.isFormValid = false;
      }
    },
    resetState: (state) => {
      state.password = "";
      state.confirmPassword = "";
      state.passwordError = "";
      state.confirmPasswordError = "";
      state.isFormValid = false;
      state.error = "";
      state.loading = false;
      state.successMessage = "";
      state.verifyLoading = false;
      state.verifyError = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyResetSession.pending, (state) => {
        state.verifyLoading = true;
        state.verifyError = "";
      })
      .addCase(verifyResetSession.fulfilled, (state) => {
        state.verifyLoading = false;
      })
      .addCase(verifyResetSession.rejected, (state, action) => {
        state.verifyLoading = false;
        state.verifyError = action.payload;
      });

    builder
      .addCase(resetPasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.successMessage = "";
      })
      .addCase(resetPasswordThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setPassword,
  setConfirmPassword,
  validatePassword,
  validateConfirmPassword,
  validateForm,
  resetState,
} = resetPasswordSlice.actions;
export default resetPasswordSlice.reducer;
