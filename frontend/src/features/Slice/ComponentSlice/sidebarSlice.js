// import { createSlice } from "@reduxjs/toolkit";

// const sidebarSlice = createSlice({
//   name: "sidebar",
//   initialState: {
//     isSidebarOpen: true, // Start with sidebar open
//     activeItem: "Dashboard",
//     isWorkspaceOpen: false,
//   },
//   reducers: {
//     toggleSidebar: (state) => {
//       state.isSidebarOpen = !state.isSidebarOpen;
//     },
//     setActiveItem: (state, action) => {
//       state.activeItem = action.payload;
//     },
//     toggleWorkspaceOpen: (state) => {
//       state.isWorkspaceOpen = !state.isWorkspaceOpen;
//     },
//   },
// });

// export const { toggleSidebar, setActiveItem, toggleWorkspaceOpen } =
//   sidebarSlice.actions;
// export default sidebarSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState: {
    isSidebarOpen: true,
    activeItem: "Dashboard",
    isWorkspaceOpen: false,
    workspaces: [],
    selectedWorkspace: null,
    workspaceViewMode: "list", // ['list', 'grid']
  },
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setActiveItem: (state, action) => {
      state.activeItem = action.payload;
    },
    toggleWorkspaceOpen: (state) => {
      state.isWorkspaceOpen = !state.isWorkspaceOpen;
    },
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    selectWorkspace: (state, action) => {
      state.selectedWorkspace = action.payload;
    },
    changeViewMode: (state, action) => {
      state.workspaceViewMode = action.payload;
    },
    archiveWorkspace: (state, action) => {
      const workspace = state.workspaces.find(w => w.id === action.payload);
      if (workspace) {
        workspace.isArchived = true;
      }
    },
  },
});

export const { 
  toggleSidebar, 
  setActiveItem, 
  toggleWorkspaceOpen,
  setWorkspaces,
  selectWorkspace,
  changeViewMode,
  archiveWorkspace
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
