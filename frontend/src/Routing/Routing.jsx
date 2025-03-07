import "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../Auth/Login";
import Signup from "../Auth/Signup";
import ForgetPassword from "../Auth/ForgetPassword";
import Verification from "../Auth/Verification";
import ResetPassword from "../Auth/ResetPassword";
import Dashboard from "../Main/Dashboard";
import MainBoard from "../Board/mainBoard";
import Workspace from "../Main/Workspace";
import Collaboration from "../Main/Collaboration";
import Private from "../Main/Private";
import Calender from "../Main/Calender";
import Setting from "../Main/Setting";
import Main from "../Main/Main";

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
        <Route path="/mainboard" element={<MainBoard />} />

        <Route path="/main/*" element={<Main />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="workspace" element={<Workspace />} />
          <Route path="collaboration" element={<Collaboration />} />
          <Route path="private" element={<Private />} />
          <Route path="calendar" element={<Calender />} />
          <Route path="setting" element={<Setting />} />
        </Route>
      </Routes>
    </div>
  );
}

export default Routing;
