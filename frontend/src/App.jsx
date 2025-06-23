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
import { io } from "socket.io-client";
import { fetchUnreadCount, addNotification } from "./features/Slice/userSlice/notificationSlice";
import toast from "react-hot-toast";

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
    const initializeUser = async () => {
      try {
        const authResult = await dispatch(checkAuthStatus()).unwrap();
        if (authResult?.isAuthenticated) {
          await dispatch(fetchUserData());
          await dispatch(fetchUserPublicWorkspaces());
        }
      } catch (error) {
        console.error("Failed to initialize user:", error);
      }
    };

    initializeUser();
  }, [dispatch]);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);
  useEffect(() => {}, [currentUser]);

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

  // Socket.IO setup for real-time notifications
  useEffect(() => {
    if (!currentUser?._id) return;

    // Get JWT token from localStorage or cookies
    const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

    // Connect to Socket.IO server
    const socket = io("http://localhost:5000", {
      auth: {
        userId: currentUser._id,
        token: token,
      },
      transports: ['websocket', 'polling'], // Ensure connection works
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket.IO connected for notifications');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    // Listen for new notifications
    socket.on("new_notification", (notification) => {
      console.log("New notification received:", notification);
      
      // Add notification to state immediately
      dispatch(addNotification(notification));
      
      // Don't call fetchUnreadCount here since addNotification already updates the count
      // dispatch(fetchUnreadCount());
      
      // Play notification sound
      notificationSound.play();
      
      // Also try browser notification sound as fallback
      notificationSound.playBrowserNotification();
      
      // Show toast notification
      toast.success(notification.message, {
        duration: 4000,
        position: "top-right",
        icon: "🔔",
        style: {
          background: '#4D2D61',
          color: '#fff',
        },
      });
    });

    // Listen for notification read events
    socket.on("notification_read", (notificationId) => {
      console.log("Notification read:", notificationId);
      // Update notification in state
      dispatch({ type: "notification/markAsRead/fulfilled", payload: notificationId });
    });

    // Listen for all notifications read events
    socket.on("all_notifications_read", () => {
      console.log("All notifications read");
      dispatch({ type: "notification/markAllAsRead/fulfilled" });
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [currentUser?._id, dispatch]);

  if (authLoading && location.pathname !== "/") {
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
