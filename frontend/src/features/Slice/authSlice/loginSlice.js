import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUserData } from "../userSlice/userSlice";
import { fetchUserPublicWorkspaces } from "../WorkspaceSlice/userWorkspacesSlice";

const API_BASE_URL = "/api/v1";

const initialState = {
  user: null,
  form: {
    email: "",
    password: "",
  },
  errorMessage: "",
  emailError: "",
  passwordError: "",
  loading: false,
  isAuthenticated: false,
  oauthLoading: {
    loading: false,
    error: null,
    activeProvider: null,
  },
};

// Check auth status
export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { dispatch }) => {
    try {
      const userData = await dispatch(fetchUserData()).unwrap();
      return {
        isAuthenticated: true,
        user: userData,
      };
    } catch (error) {
      console.error("Auth check failed:", error);
      return {
        isAuthenticated: false,
        user: null,
      };
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      console.log("Starting login process...");
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          return rejectWithValue(errorData.errors);
        }
        return rejectWithValue(errorData.message || "Login failed");
      }

      const data = await response.json();
      console.log("Login successful, fetching user data...");

      // Fetch user data after successful login
      const userDataResponse = await dispatch(fetchUserData()).unwrap();
      console.log("User data fetched, now fetching workspaces...");
      
      // Fetch user workspaces after successful login
      await dispatch(fetchUserPublicWorkspaces());
      console.log("Workspaces fetch dispatched");
      
      return { ...data, user: userDataResponse };
    } catch (error) {
      console.error("Login error:", error);
      return rejectWithValue(
        error.message || "Login failed. Please try again."
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/logout`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Logout failed");
      }

      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return rejectWithValue(error.message || "Logout failed");
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
    resetAuthState: (state) => {
      return {
        ...initialState,
        isAuthenticated: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.errorMessage = "";
        state.emailError = "";
        state.passwordError = "";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.errorMessage = "";
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.errorMessage =
          action.payload ?? "Login failed. Please try again.";
      })
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        return {
          ...initialState,
          isAuthenticated: false,
        };
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.errorMessage = action.payload;
      })
      // Check auth status cases
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload.isAuthenticated;
        state.user = action.payload.user;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      // Update user data when fetched
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUserData.rejected, (state) => {
        if (!state.user) {
          state.isAuthenticated = false;
        }
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
  resetAuthState,
} = loginSlice.actions;

export default loginSlice.reducer;
