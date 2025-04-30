// import "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// import Login from "../Auth/Login";
// import Signup from "../Auth/Signup";
// import ForgetPassword from "../Auth/ForgetPassword";
// import Verification from "../Auth/Verification";
// import ResetPassword from "../Auth/ResetPassword";
// import Dashboard from "../Main/Dashboard";
// import MainBoard from "../Board/mainBoard";
// // import WorkspacePopup from "../Workspace/WorkspacePopup";

// import Notifications from "../Main/Notifications";
// import Main from "../Main/Main";
// import ChatList from "../Chat/ChatList";
// import ChatLayout from "../Chat/ChatLayout";

// function Routing() {
//   return (
//     <div className="w-full h-full">
//       <Routes>
//         <Route path="/" element={<Login />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/signup" element={<Signup />} />
//         <Route path="/forgetpassword" element={<ForgetPassword />} />
//         <Route path="/verification" element={<Verification />} />
//         <Route path="/resetpassword" element={<ResetPassword />} />
//         <Route path="/mainboard" element={<MainBoard />} />
//         <Route path="/chatlist" element={<ChatList />} />

//         <Route path="/main/*" element={<Main />}>
//           <Route index element={<Navigate to="dashboard" />} />
//           <Route path="dashboard" element={<Dashboard />} />
//           <Route path="notifications" element={<Notifications />} />
//           <Route path="chat" element={<ChatLayout />} />
//         </Route>
//       </Routes>
//     </div>
//   );
// }

// export default Routing;



import "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../Auth/Login";
import Signup from "../Auth/Signup";
import ForgetPassword from "../Auth/ForgetPassword";
import Verification from "../Auth/Verification";
import ResetPassword from "../Auth/ResetPassword";
import Dashboard from "../Main/Dashboard";
import MainBoard from "../Board/MainBoard";
import Notifications from "../Main/Notifications";
import Main from "../Main/Main";
import ChatLayout from "../Chat/ChatLayout";
import { useSelector } from "react-redux";

function Routing() {
  const isAuthenticated = useSelector((state) => state.login?.isAuthenticated);

  return (
    <div className="w-full h-full">
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/main/dashboard" /> : <Login />
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgetpassword" element={<ForgetPassword />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/resetpassword" element={<ResetPassword />} />
<<<<<<< HEAD
        <Route path="/chatlist" element={<ChatList />} />

        {/* All Main layout routes go here */}
        <Route path="/main/*" element={<Main />}>
=======

        {/* Protected Routes */}
        <Route
          path="/mainboard"
          element={isAuthenticated ? <MainBoard /> : <Navigate to="/login" />}
        />

        <Route
          path="/main/*"
          element={isAuthenticated ? <Main /> : <Navigate to="/login" />}
        >
>>>>>>> 8634ec6e9faba5b4c2c4cd5fe2350247f6e0bcea
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="chat" element={<ChatLayout />} />
          <Route path="mainboard" element={<MainBoard />} /> {/* Moved here */}
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default Routing;
<<<<<<< HEAD


=======
>>>>>>> 8634ec6e9faba5b4c2c4cd5fe2350247f6e0bcea
