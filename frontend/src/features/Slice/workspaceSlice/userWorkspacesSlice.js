import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:3000";

// Selector to check if we need to refetch workspaces
export const selectShouldFetchWorkspaces = (state) => {
  const { workspaces, lastFetched } = state.userWorkspaces;
  return workspaces.length === 0 || !lastFetched || (Date.now() - lastFetched > 5 * 60 * 1000);
};

// Async thunk for fetching user's public workspaces
export const fetchUserPublicWorkspaces = createAsyncThunk(
  "userWorkspaces/fetchUserPublicWorkspaces",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/workspaces/public-member`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json();

      // Accept both ownedWorkspaces and workspaces for compatibility
      const workspaces = data?.data?.workspaces;
      if (data?.status === "success" && workspaces) {
        console.log(workspaces);
        return workspaces;
      } else {
        return rejectWithValue(data?.message || "Failed to fetch workspaces");
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch workspaces");
    }
  }
);

// Async thunk for selecting a workspace
export const selectUserWorkspace = createAsyncThunk(
  "userWorkspaces/selectUserWorkspace",
  async (workspace, { rejectWithValue }) => {
    try {
      if (!workspace) {
        return rejectWithValue("No workspace selected");
      }

      // Create workspace data object
      const workspaceData = {
        id: workspace._id,
        name: workspace.name,
        type: workspace.type,
        description: workspace.description,
        memberCount: workspace.memberCount,
        createdBy: workspace.createdBy,
        userRole: workspace.userRole,
      };

      return workspaceData;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to select workspace");
    }
  }
);

const userWorkspacesSlice = createSlice({
  name: "userWorkspaces",
  initialState: {
    workspaces: [],
    selectedWorkspace: null,
    loading: false,
    error: null,
    isPopupOpen: false,
    isAnimating: false,
    searchTerm: "",
    sortOption: "-updatedAt",
    lastFetched: null,
  },
  reducers: {
    openUserWorkspacesPopup: (state) => {
      state.isPopupOpen = true;
      state.isAnimating = true;
    },
    closeUserWorkspacesPopup: (state) => {
      state.isPopupOpen = false;
      state.isAnimating = true;
    },
    setAnimating: (state, action) => {
      state.isAnimating = action.payload;
    },
    clearUserWorkspaces: (state) => {
      state.workspaces = [];
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setSortOption: (state, action) => {
      state.sortOption = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateWorkspaceInList: (state, action) => {
      const { id, name, description } = action.payload;
      const idx = state.workspaces.findIndex(ws => ws._id === id || ws.id === id);
      if (idx !== -1) {
        if (name) state.workspaces[idx].name = name;
        if (description !== undefined) state.workspaces[idx].description = description;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPublicWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPublicWorkspaces.fulfilled, (state, action) => {
        state.workspaces = action.payload;
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchUserPublicWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload || "Failed to fetch workspaces", {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#F9E4E4",
            color: "#DC2626",
            border: "1px solid #DC2626",
          },
        });
      })
      .addCase(selectUserWorkspace.fulfilled, (state, action) => {
        state.selectedWorkspace = action.payload;
      })
      .addCase(selectUserWorkspace.rejected, (state, action) => {
        state.error = action.payload;
        toast.error(action.payload || "Failed to select workspace", {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#F9E4E4",
            color: "#DC2626",
            border: "1px solid #DC2626",
          },
        });
      });
  },
});

export const {
  openUserWorkspacesPopup,
  closeUserWorkspacesPopup,
  setAnimating,
  clearUserWorkspaces,
  setSearchTerm,
  setSortOption,
  clearError,
  updateWorkspaceInList,
} = userWorkspacesSlice.actions;

export default userWorkspacesSlice.reducer;