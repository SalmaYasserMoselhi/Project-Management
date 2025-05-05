import { createSlice } from "@reduxjs/toolkit";

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState: {
    isSidebarOpen: true,
    activeItem: "Dashboard",
    isWorkspaceOpen: false,
    activeWorkspaceType: null, // "workspace", "collaboration", or "private"
    workspaces: [],
    selectedWorkspace: null, // Will hold the currently selected workspace data
    workspaceViewMode: "list", // ['list', 'grid']
    // Transition state to track animation phases
    workspaceTransitionState: "closed", // "closed", "opening", "open", "closing"
  },
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setActiveItem: (state, action) => {
      state.activeItem = action.payload;
    },
    // Start the opening animation
    openWorkspaceStart: (state) => {
      // Only allow transition if not already in a transition state
      if (state.workspaceTransitionState !== "opening" && 
          state.workspaceTransitionState !== "closing") {
        state.workspaceTransitionState = "opening";
      }
    },
    // Complete the opening animation
    openWorkspaceComplete: (state) => {
      if (state.workspaceTransitionState === "opening") {
        state.isWorkspaceOpen = true;
        state.workspaceTransitionState = "open";
      }
    },
    // Start the closing animation
    closeWorkspaceStart: (state) => {
      // Only allow transition if workspace is open or opening
      if (state.workspaceTransitionState === "open" || 
          state.workspaceTransitionState === "opening") {
        state.workspaceTransitionState = "closing";
      }
    },
    // Complete the closing animation
    closeWorkspaceComplete: (state) => {
      if (state.workspaceTransitionState === "closing") {
        state.isWorkspaceOpen = false;
        state.workspaceTransitionState = "closed";
        // Only clear activeWorkspaceType when fully closed
        state.activeWorkspaceType = null;
      }
    },
    // Set the type of workspace being viewed (workspace, collaboration, private)
    // This does NOT change the selected workspace, only filters the view
    setActiveWorkspaceType: (state, action) => {
      state.activeWorkspaceType = action.payload;
    },
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    // This action changes the actual selected workspace and name in the sidebar
    selectWorkspace: (state, action) => {
      state.selectedWorkspace = action.payload;
    },
    changeViewMode: (state, action) => {
      state.workspaceViewMode = action.payload;
    },
    archiveWorkspace: (state, action) => {
      const workspace = state.workspaces.find((w) => w.id === action.payload);
      if (workspace) {
        workspace.isArchived = true;
      }
    },
  },
});

export const {
  toggleSidebar,
  setActiveItem,
  openWorkspaceStart,
  openWorkspaceComplete,
  closeWorkspaceStart,
  closeWorkspaceComplete,
  setActiveWorkspaceType,
  setWorkspaces,
  selectWorkspace,
  changeViewMode,
  archiveWorkspace,
} = sidebarSlice.actions;

export default sidebarSlice.reducer;