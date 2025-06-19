import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../Slice/authSlice/loginSlice";
import forgotPasswordReducer from "../Slice/authSlice/forgotPasswordSlice";
import resetPasswordReducer from "../Slice/authSlice/resetPasswordSlice";
import userReducer from "../Slice/userSlice/userSlice";
import sidebarReducer from "../Slice/ComponentSlice/sidebarSlice";
import chatReducer from "../Slice/ChatSlice/chatSlice";
import userWorkspacesReducer from "../Slice/WorkspaceSlice/userWorkspacesSlice";
import boardsReducer from "../Slice/WorkspaceSlice/boardsSlice";
import cardDetailsReducer from "../Slice/cardSlice/cardDetailsSlice";
import meetingModalReducer from "../Slice/MeetingSlice/meetingModalSlice";
import meetingsReducer from "../Slice/MeetingSlice/meetingsSlice";
import dashboardReducer from "../Slice/dashboard/dashboardSlice";
import profilePopupReducer from "../Slice/userSlice/profilePopupSlice";
import notificationReducer from "../Slice/userSlice/notificationSlice";

export const store = configureStore({
  reducer: {
    login: loginReducer,
    forgotPassword: forgotPasswordReducer,
    resetPassword: resetPasswordReducer,
    user: userReducer,
    sidebar: sidebarReducer,
    chat: chatReducer,
    userWorkspaces: userWorkspacesReducer,
    boards: boardsReducer,
    cardDetails: cardDetailsReducer,
    meetingModal: meetingModalReducer,
    meetings: meetingsReducer,
    dashboard: dashboardReducer,
    profilePopup: profilePopupReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: true,
});

export default store;
