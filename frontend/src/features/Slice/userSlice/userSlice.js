import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Utility function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry configuration
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

export const fetchUserData = createAsyncThunk(
  "user/fetchUserData",
  async (_, { rejectWithValue }) => {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch("/api/v1/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        // Handle rate limiting
        if (response.status === 429) {
          console.warn(`Rate limited, attempt ${retries + 1}/${MAX_RETRIES}`);
          await delay(RETRY_DELAY);
          retries++;
          continue;
        }

        // Handle other error responses
        if (!response.ok) {
          if (response.status === 401) {
            console.warn("Authentication failed - no valid session");
            return rejectWithValue("Unauthorized");
          }

          let errorMessage = "Failed to fetch user data";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            console.warn("Error response is not in JSON format");
          }
          return rejectWithValue(errorMessage);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Unexpected response format:", contentType);
          return rejectWithValue("Invalid response format");
        }

        const data = await response.json();
        // console.log("User data response:", data);

        // Check for the expected data structure
        if (!data.data?.user) {
          console.error("Invalid user data format:", data);
          return rejectWithValue("Invalid user data format");
        }

        return data.data.user;
      } catch (error) {
        if (retries < MAX_RETRIES - 1) {
          console.warn(
            `Request failed, retrying (${retries + 1}/${MAX_RETRIES})...`
          );
          await delay(RETRY_DELAY);
          retries++;
          continue;
        }
        console.error("Error in fetchUserData:", error);
        return rejectWithValue(error.message || "Failed to fetch user data");
      }
    }

    return rejectWithValue("Max retries exceeded");
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  retryCount: 0,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUserData: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      state.retryCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
        state.retryCount = 0;
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        if (action.payload === "Unauthorized") {
          state.user = null;
        }
      });
  },
});

export const { clearUserData } = userSlice.actions;
export default userSlice.reducer;
