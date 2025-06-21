// import "react";
// import { Navigate, Route, Routes } from "react-router-dom";
// import ForgetPassword from "../Auth/ForgetPassword";
// import Login from "../Auth/Login";
// import ResetPassword from "../Auth/ResetPassword";
// import Signup from "../Auth/Signup";
// import Verification from "../Auth/Verification";
// import VerificationFailed from "../Auth/verification-failed";
// import VerificationSuccess from "../Auth/verification-success";
// import MainBoard from "../Board/MainBoard";
// import Dashboard from "../Main/Dashboard";
// import WorkspaceSettings from "../Main/WorkspaceSettings";
// import LandingPage from "../Landing/LandingPage";
// import ChatLayout from "../Chat/ChatLayout";
// import Main from "../Main/Main";
// import Notifications from "../Main/Notifications";

// export default function Routing() {
//   return (
//     <Routes>
//       {/* Landing Page */}
//       <Route path="/" element={<LandingPage />} />

//       {/* Auth Routes */}
//       <Route path="/login" element={<Login />} />
//       <Route path="/signup" element={<Signup />} />
//       <Route path="/forgetpassword" element={<ForgetPassword />} />
//       <Route path="/resetpassword" element={<ResetPassword />} />
//       <Route path="/verification" element={<Verification />} />
//       <Route path="/verification-success" element={<VerificationSuccess />} />
//       <Route path="/verification-failed" element={<VerificationFailed />} />

//       {/* Rest of your routes */}
//       <Route path="/main/*" element={<Main />}>
//         <Route index element={<Navigate to="dashboard" />} />
//         <Route path="dashboard" element={<Dashboard />} />
//         <Route path="notifications" element={<Notifications />} />
//         <Route path="chat" element={<ChatLayout />} />
//         <Route
//           path="workspaces/:workspaceId/boards/:boardId"
//           element={<MainBoard />}
//         />
//         <Route
//           path="workspaces/:workspaceId/settings"
//           element={<WorkspaceSettings />}
//         />
//       </Route>
//     </Routes>
//   );
// }

import "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
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
import LandingPage from "../Landing/LandingPage";
import ChatLayout from "../Chat/ChatLayout";
import Main from "../Main/Main";
import Notifications from "../Main/Notifications";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.login);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.login);

  if (isAuthenticated) {
    return <Navigate to="/main/dashboard" replace />;
  }

  return children;
};

export default function Routing() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes - Public but redirect if authenticated */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/forgetpassword"
        element={
          <PublicRoute>
            <ForgetPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/resetpassword"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/verification"
        element={
          <PublicRoute>
            <Verification />
          </PublicRoute>
        }
      />
      <Route
        path="/verification-success"
        element={
          <PublicRoute>
            <VerificationSuccess />
          </PublicRoute>
        }
      />
      <Route
        path="/verification-failed"
        element={
          <PublicRoute>
            <VerificationFailed />
          </PublicRoute>
        }
      />

      {/* Protected Routes - Require Authentication */}
      <Route
        path="/main/*"
        element={
          <ProtectedRoute>
            <Main />
          </ProtectedRoute>
        }
      >
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

      {/* Catch all route - redirect to login if not authenticated */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
