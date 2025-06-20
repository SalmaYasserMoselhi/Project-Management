import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import Sidebar from "./Components/Sidebar";
import { useEffect } from "react";
import { checkAuthStatus } from "./features/Slice/authSlice/loginSlice";
import { fetchUserData } from "./features/Slice/userSlice/userSlice";
import "./index.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Routing from "./Routing/Routing";
import WorkspacePopup from "./Workspace/WorkspacePopup";
import { fetchUserPublicWorkspaces } from "./features/Slice/WorkspaceSlice/userWorkspacesSlice";
import axios from "./utils/axiosConfig";

function App() {
  const { isWorkspaceOpen, selectedWorkspace, workspaceTransitionState } =
    useSelector((state) => state.sidebar);

  const { authLoading } = useSelector((state) => state.login);
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth?.user);
  const userWorkspaces = useSelector(
    (state) => state.userWorkspaces.workspaces
  );

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // List of auth pages where we don't want Sidebar and WorkspacePopup
  const authPages = [
    "/",
    "/login",
    "/signup",
    "/forgetpassword",
    "/verification",
    "/resetpassword",
    "/verification-success",
    "/verification-failed",
  ];

  // Check if current page is auth
  const isAuthPage = authPages.some((path) => {
    const isMatch = location.pathname === path;
    return isMatch;
  });

  // Should we render the workspace popup?
  const shouldRenderWorkspacePopup =
    !isAuthPage &&
    (isWorkspaceOpen ||
      workspaceTransitionState === "opening" ||
      workspaceTransitionState === "closing");

  useEffect(() => {
    if (
      currentUser?._id &&
      (!Array.isArray(userWorkspaces) || userWorkspaces.length === 0)
    ) {
      dispatch(fetchUserPublicWorkspaces());
    }
  }, [currentUser?._id, userWorkspaces, dispatch]);

  useEffect(() => {
    // عند الدخول: set status online
    const setOnline = async () => {
      try {
        await axios.patch("/api/v1/users/updateStatus", { status: "online" });
      } catch (err) {}
    };
    setOnline();

    // عند الخروج: set status offline
    const setOffline = async () => {
      try {
        await axios.patch("/api/v1/users/updateStatus", { status: "offline" });
      } catch (err) {}
    };
    window.addEventListener("beforeunload", setOffline);

    return () => {
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{
            border: "4px solid rgba(77, 45, 97, 0.2)",
            borderTopColor: "#4D2D61",
          }}
        ></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex">
      <Toaster />

      {/* Show Sidebar only if NOT on auth page */}
      {!isAuthPage && <Sidebar />}

      {/* Only show WorkspacePopup if a workspace is selected and in the right state */}
      {shouldRenderWorkspacePopup && selectedWorkspace && (
        <WorkspacePopup
          workspaceId={selectedWorkspace.id}
          workspaceName={selectedWorkspace.name}
        />
      )}

      <div className="flex-1 overflow-auto">
        <Routing />
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
