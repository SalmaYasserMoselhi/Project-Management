import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = "/api/v1";
const initialState = {
  form: {
    email: "",
    password: "",
  },
  errorMessage: "",
  emailError: "",
  passwordError: "",
  loading: false,
  oauthLoading: {
    loading: false,
    error: null,
    activeProvider: null,
  },
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Login failed");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Login error:", error);
      return rejectWithValue(
        error.message || "Login failed. Please try again."
      );
    }
  }
);

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    setEmail: (state, action) => {
      state.form.email = action.payload;
    },
    setPassword: (state, action) => {
      state.form.password = action.payload;
    },
    setEmailError: (state, action) => {
      state.emailError = action.payload;
    },
    setPasswordError: (state, action) => {
      state.passwordError = action.payload;
    },
    setErrorMessage: (state, action) => {
      state.errorMessage = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setOAuthLoading: (state, action) => {
      state.oauthLoading = action.payload;
    },
    resetErrors: (state) => {
      state.emailError = "";
      state.passwordError = "";
      state.errorMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.errorMessage = "";
        state.emailError = "";
        state.passwordError = "";
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.errorMessage =
          action.payload ?? "Login failed. Please try again.";
      });
  },
});

export const {
  setEmail,
  setPassword,
  setEmailError,
  setPasswordError,
  setErrorMessage,
  setLoading,
  setOAuthLoading,
  resetErrors,
} = loginSlice.actions;

export default loginSlice.reducer;
