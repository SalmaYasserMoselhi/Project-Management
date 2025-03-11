import { createSlice } from "@reduxjs/toolkit";

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState: {
    isSidebarOpen: true, // Start with sidebar open
    activeItem: "Dashboard",
    isWorkspaceOpen: false,
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
  },
});

export const { toggleSidebar, setActiveItem, toggleWorkspaceOpen } =
  sidebarSlice.actions;
export default sidebarSlice.reducer;
