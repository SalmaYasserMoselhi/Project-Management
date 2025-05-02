import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Routing from "./Routing/Routing";
import WorkspacePopup from "./Workspace/WorkspacePopup";
import Sidebar from "./Components/Sidebar";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUserData } from "./features/Slice/userSlice/userSlice";
import "./index.css";
import { ChatProvider } from "./context/chat-context";

function App() {
  const { isWorkspaceOpen, selectedWorkspace, workspaceTransitionState } =
    useSelector((state) => state.sidebar);

  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUserData());
  }, [dispatch]);

  // List of auth pages where we don't want Sidebar and WorkspacePopup
  const authPages = [
    "/",
    "/login",
    "/signup",
    "/forgetpassword",
    "/verification",
    "/resetpassword",
  ];

  // Check if current page is auth
  const isAuthPage = authPages.some((path) => {
    const isMatch = location.pathname === path;
    // console.log("Auth page check:", {
    //   currentPath: location.pathname,
    //   checkingPath: path,
    //   isMatch,
    // });
    return isMatch;
  });

  // Should we render the workspace popup?
  const shouldRenderWorkspacePopup =
    !isAuthPage &&
    (isWorkspaceOpen ||
      workspaceTransitionState === "opening" ||
      workspaceTransitionState === "closing");

  // console.log("Workspace Popup Render Conditions:", {
  //   isAuthPage,
  //   currentPath: location.pathname,
  //   isWorkspaceOpen,
  //   workspaceTransitionState,
  //   selectedWorkspace,
  //   shouldRenderWorkspacePopup,
  // });

  return (
    <ChatProvider>
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
      </div>
    </ChatProvider>
  );
}

export default App;
