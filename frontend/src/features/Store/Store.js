import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../Slice/authSlice/loginSlice";
import forgotPasswordReducer from "../Slice/authSlice/forgotPasswordSlice";
import resetPasswordReducer from "../Slice/authSlice/resetPasswordSlice";
import userReducer from "../Slice/userSlice/userSlice";
import sidebarReducer from "../Slice/ComponentSlice/sidebarSlice";
import chatReducer from "../Slice/ChatSlice/chatSlice";

export const store = configureStore({
  reducer: {
    login: loginReducer,
    forgotPassword: forgotPasswordReducer,
    resetPassword: resetPasswordReducer,
    user: userReducer,

    sidebar: sidebarReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: true,
});

export default store;
