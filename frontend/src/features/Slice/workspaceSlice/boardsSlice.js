import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:3000";

// Async thunk for fetching boards
export const fetchBoards = createAsyncThunk(
  "boards/fetchBoards",
  async (
    { workspaceId, activeTab, sortOption, searchTerm },
    { rejectWithValue }
  ) => {
    try {
      if (!workspaceId) {
        return rejectWithValue("Workspace not selected");
      }

      let endpoint;
      let queryParams = [];

      if (activeTab === "Archived") {
        endpoint = "/api/v1/boards/user-boards/archived";
        queryParams.push(
          `sort=${sortOption}`,
          `limit=1000` // Very high limit to get all boards
        );
      } else {
        endpoint = `/api/v1/boards/workspace/${workspaceId}/boards`;
        queryParams.push(
          `sort=${sortOption}`,
          `limit=1000` // Very high limit to get all boards
        );

        // Add search parameter if there's a search term
        if (searchTerm) {
          queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
        }
      }

      const fullUrl = `${BASE_URL}${endpoint}?${queryParams.join("&")}`;

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data?.status === "success") {
        return {
          boards: data.data?.boards || [],
          totalBoards: data.data?.stats.total || 0,
        };
      } else {
        return rejectWithValue(data?.message || "Failed to fetch boards");
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch boards");
    }
  }
);

// Async thunk for toggling board star status
export const toggleBoardStar = createAsyncThunk(
  "boards/toggleBoardStar",
  async ({ boardId, isStarred }, { rejectWithValue }) => {
    try {
      if (!boardId) {
        return rejectWithValue("Board ID is required");
      }

      const endpoint = `${BASE_URL}/api/v1/boards/user-boards/${boardId}/${
        isStarred ? "unstar" : "star"
      }`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data?.status === "success") {
        return { boardId, isStarred: !isStarred };
      } else {
        return rejectWithValue(
          data?.message || "Failed to update board star status"
        );
      }
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to update board star status"
      );
    }
  }
);

// Async thunk for creating a new board
export const createBoard = createAsyncThunk(
  "boards/createBoard",
  async ({ workspaceId, name, description }, { rejectWithValue }) => {
    try {
      if (!workspaceId) {
        return rejectWithValue("No workspace selected. Please try again.");
      }

      if (!name.trim()) {
        return rejectWithValue("Board name is required");
      }

      const response = await fetch(`${BASE_URL}/api/v1/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          workspace: workspaceId,
          name: name.trim(),
          description: (description || "").trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data?.status === "success") {
        toast.success("Board created successfully!", {
          duration: 3000,
          position: "top-right",
          style: {
            background: "#4B2D73",
            color: "#fff",
          },
        });
        return data.data.board;
      } else {
        return rejectWithValue(data?.message || "Failed to create board");
      }
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to create board. Please try again."
      );
    }
  }
);

// Async thunk for archiving/restoring a board
export const archiveBoard = createAsyncThunk(
  "boards/archiveBoard",
  async ({ boardId, isArchiving }, { rejectWithValue }) => {
    try {
      const action = isArchiving ? "archive" : "restore";
      const endpoint = `${BASE_URL}/api/v1/boards/user-boards/${boardId}/${action}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(
          `Board successfully ${isArchiving ? "archived" : "restored"}.`
        );
        return { boardId };
      } else {
        throw new Error(data.message || `Failed to ${action} board.`);
      }
    } catch (err) {
      toast.error(err.message || "An error occurred. Please try again.");
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk for deleting a board
export const deleteBoard = createAsyncThunk(
  "boards/deleteBoard",
  async (boardId, { rejectWithValue }) => {
    try {
      const endpoint = `${BASE_URL}/api/v1/boards/user-boards/${boardId}`;
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.status === 204) {
        toast.success("Board permanently deleted.");
        return { boardId };
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete board.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete board.");
      return rejectWithValue(err.message);
    }
  }
);

const boardsSlice = createSlice({
  name: "boards",
  initialState: {
    boards: [],
    loading: false,
    error: null,
    activeTab: "Active",
    searchTerm: "",
    sortOption: "-updatedAt",
    totalBoards: 0,
    isAddBoardOpen: false,
    isMenuOpen: false,
    openBoardMenuId: null,
    // Add board form state
    boardName: "",
    boardDescription: "",
    createBoardLoading: false,
    createBoardError: null,
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      state.boards = [];
      state.totalBoards = 0;
      state.loading = true;
      state.error = null;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setSortOption: (state, action) => {
      state.sortOption = action.payload;
      state.isMenuOpen = false;
    },
    toggleIsMenuOpen: (state) => {
      state.isMenuOpen = !state.isMenuOpen;
    },
    closeMenu: (state) => {
      state.isMenuOpen = false;
    },
    toggleBoardMenu: (state, action) => {
      state.openBoardMenuId =
        state.openBoardMenuId === action.payload ? null : action.payload;
    },
    closeBoardMenu: (state) => {
      state.openBoardMenuId = null;
    },
    openAddBoardPopup: (state) => {
      state.isAddBoardOpen = true;
      // Reset form state when opening popup
      state.boardName = "";
      state.boardDescription = "";
      state.createBoardError = null;
    },
    closeAddBoardPopup: (state) => {
      state.isAddBoardOpen = false;
    },
    setBoardName: (state, action) => {
      state.boardName = action.payload;
    },
    setBoardDescription: (state, action) => {
      state.boardDescription = action.payload;
    },
    clearBoardsError: (state) => {
      state.error = null;
    },
    clearCreateBoardError: (state) => {
      state.createBoardError = null;
    },
    resetWorkspacePopup: (state) => {
      state.activeTab = "Active";
      state.searchTerm = "";
      state.sortOption = "-updatedAt";
      state.isMenuOpen = false;
      state.openBoardMenuId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch boards
      .addCase(fetchBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.boards = [];
        state.totalBoards = 0;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.boards = action.payload.boards;
        state.totalBoards = action.payload.totalBoards;
        state.loading = false;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.boards = [];
      })
      // Toggle board star
      .addCase(toggleBoardStar.fulfilled, (state, action) => {
        const { boardId, isStarred } = action.payload;
        state.boards = state.boards.map((board) =>
          board.id === boardId ? { ...board, starred: isStarred } : board
        );
      })
      .addCase(toggleBoardStar.rejected, (state, action) => {
        toast.error(action.payload || "Failed to update board star status", {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#F9E4E4",
            color: "#DC2626",
            border: "1px solid #DC2626",
          },
        });
      })
      // Create board
      .addCase(createBoard.pending, (state) => {
        state.createBoardLoading = true;
        state.createBoardError = null;
      })
      .addCase(createBoard.fulfilled, (state) => {
        state.createBoardLoading = false;
        state.isAddBoardOpen = false;
        // Note: We don't add the board to the array here because we'll refresh the list
      })
      .addCase(createBoard.rejected, (state, action) => {
        state.createBoardLoading = false;
        state.createBoardError = action.payload;

        toast.error(action.payload || "Failed to create board", {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#F9E4E4",
            color: "#DC2626",
            border: "1px solid #DC2626",
          },
        });
      })
      // Archive or Restore Board
      .addCase(archiveBoard.fulfilled, (state, action) => {
        state.boards = state.boards.filter(
          (board) => board.id !== action.payload.boardId
        );
        state.totalBoards = Math.max(0, state.totalBoards - 1);
        state.openBoardMenuId = null;
      })
      // Delete Board
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.boards = state.boards.filter(
          (board) => board.id !== action.payload.boardId
        );
        state.totalBoards = Math.max(0, state.totalBoards - 1);
        state.openBoardMenuId = null;
      });
  },
});

export const {
  setActiveTab,
  setSearchTerm,
  setSortOption,
  toggleIsMenuOpen,
  closeMenu,
  toggleBoardMenu,
  closeBoardMenu,
  openAddBoardPopup,
  closeAddBoardPopup,
  setBoardName,
  setBoardDescription,
  clearBoardsError,
  clearCreateBoardError,
  resetWorkspacePopup,
} = boardsSlice.actions;

export default boardsSlice.reducer;
