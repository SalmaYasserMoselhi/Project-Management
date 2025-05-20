import "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ForgetPassword from "../Auth/ForgetPassword";
import Login from "../Auth/Login";
import ResetPassword from "../Auth/ResetPassword";
import Signup from "../Auth/Signup";
import Verification from "../Auth/Verification";
import VerificationFailed from "../Auth/verification-failed";
import VerificationSuccess from "../Auth/verification-success";
import MainBoard from "../Board/MainBoard";
import Dashboard from "../Main/Dashboard";
import WorkspaceSettings from "../Main/WorkspaceSettings";

import ChatLayout from "../Chat/ChatLayout";
import Main from "../Main/Main";
import Notifications from "../Main/Notifications";

function Routing() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verification-success" element={<VerificationSuccess />} />
        <Route path="/verification-failed" element={<VerificationFailed />} />
        <Route path="/forgetpassword" element={<ForgetPassword />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/resetpassword" element={<ResetPassword />} />
        {/* <Route path="/mainboard" element={<MainBoard />} /> */}

        <Route path="/main/*" element={<Main />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="chat" element={<ChatLayout />} />
          <Route
            path="workspaces/:workspaceId/boards/:boardId"
            element={<MainBoard />}
          />
          <Route
            path="workspaces/:workspaceId/settings"
            element={<WorkspaceSettings />}
          />
        </Route>
      </Routes>
    </div>
  );
}

export default Routing;
