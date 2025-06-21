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
  authLoading: true,
  isAuthenticated: false,
  oauthLoading: {
    loading: false,
    error: null,
    activeProvider: null,
  },
};

// Check auth status
// export const checkAuthStatus = createAsyncThunk(
//   "auth/checkStatus",
//   async (_, { dispatch }) => {
//     try {
//       const userData = await dispatch(fetchUserData()).unwrap();
//       return {
//         isAuthenticated: true,
//         user: userData,
//       };
//     } catch (error) {
//       console.error("Auth check failed:", error);
//       return {
//         isAuthenticated: false,
//         user: null,
//       };
//     }
//   }
// );
export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { rejectWithValue }) => {
    console.log("[Auth] 1. Starting authentication check...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch("/api/v1/users/me", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("[Auth] 2a. Response not OK. Rejecting.");
        return rejectWithValue("User not authenticated");
      }

      const data = await response.json();

      if (!data || data.status !== "success" || !data.data?.user) {
        console.error("[Auth] 3a. Invalid data format. Rejecting.");
        return rejectWithValue("Invalid user data format");
      }

      console.log("[Auth] 4. Authentication successful. Fulfilling promise.");
      return { user: data.data.user };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("[Auth] X. Caught error during auth check:", error);
      if (error.name === "AbortError") {
        return rejectWithValue("Request timed out");
      }
      return rejectWithValue(error.message || "Network or server error");
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

      // Fetch user data after successful login
      const userDataResponse = await dispatch(fetchUserData()).unwrap();

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
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/logout`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Logout failed");
      }
      localStorage.removeItem("selectedPublicWorkspace");
      localStorage.removeItem("token");

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
      // checkAuthStatus cases
      .addCase(checkAuthStatus.pending, (state) => {
        state.authLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.authLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.authLoading = false;
      })

      // loginUser cases
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

      // logoutUser cases
      .addCase(logoutUser.fulfilled, (state) => {
        Object.assign(state, initialState, {
          authLoading: false,
          isAuthenticated: false,
        });
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.errorMessage = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.authLoading = false; // Also ensure loading is false on failure
      })

      // fetchUserData cases (from another slice)
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
