import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../Slice/authSlice/loginSlice";
import forgotPasswordReducer from "../Slice/authSlice/forgotPasswordSlice";
import resetPasswordReducer from "../Slice/authSlice/resetPasswordSlice";
import userReducer from "../Slice/userSlice/userSlice";
import sidebarReducer from "../Slice/ComponentSlice/sidebarSlice";

export const store = configureStore({
  reducer: {
    login: loginReducer,
    forgotPassword: forgotPasswordReducer,
    resetPassword: resetPasswordReducer,
    user: userReducer,
    sidebar: sidebarReducer,
  },
});

export default store;
