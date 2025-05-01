import "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../Auth/Login";
import Signup from "../Auth/Signup";
import ForgetPassword from "../Auth/ForgetPassword";
import Verification from "../Auth/Verification";
import ResetPassword from "../Auth/ResetPassword";
import Dashboard from "../Main/Dashboard";
import MainBoard from "../Board/mainBoard";
// import WorkspacePopup from "../Workspace/WorkspacePopup";

import Notifications from "../Main/Notifications";
import Main from "../Main/Main";
import ChatLayout from "../Chat/ChatLayout";

function Routing() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgetpassword" element={<ForgetPassword />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/resetpassword" element={<ResetPassword />} />
        {/* <Route path="/mainboard" element={<MainBoard />} /> */}

        <Route path="/main/*" element={<Main />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="chat" element={<ChatLayout />} />
          <Route path="mainboard" element={<MainBoard />} />
        </Route>
      </Routes>
    </div>
  );
}

export default Routing;
