import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  toggleSidebar,
  setActiveItem,
  openWorkspaceStart,
  closeWorkspaceStart,
  setActiveWorkspaceType,
  selectWorkspace,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";

import {
  MessageCircle,
  Grid,
  Network,
  Users2,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  X,
} from "lucide-react";

import Avatar from "../assets/defaultAvatar.png";
import LogoF from "../assets/LogoF.png";
import LogoS from "../assets/Logo.png";

const ChatIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashboardIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WorkspaceIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2ZM12 17c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2ZM3 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2ZM21 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2ZM3.7 11h16.6M11 3.7v16.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CollaborationIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PrivateIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isClosingWorkspace, setIsClosingWorkspace] = useState(false);
  const BASE_URL = "http://localhost:3000";

  // Get state from Redux store
  const {
    isSidebarOpen,
    activeItem,
    isWorkspaceOpen,
    activeWorkspaceType,
    selectedWorkspace,
    workspaceTransitionState,
  } = useSelector((state) => state.sidebar);
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchUserData());

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Add event listener to close popup when clicking outside
    const handleClickOutside = (event) => {
      // Only handle outside clicks if workspace is open and not already closing
      if (
        (workspaceTransitionState === "open" ||
          workspaceTransitionState === "opening") &&
        !isClosingWorkspace
      ) {
        // Check if the click is outside of the sidebar, workspace popup, and add board popup
        const sidebarElement = document.getElementById("sidebar");
        const workspacePopupElement =
          document.querySelector(".workspace-popup");
        const addBoardPopupElement = document.querySelector(".add-board-popup");

        if (sidebarElement && workspacePopupElement) {
          if (
            !sidebarElement.contains(event.target) &&
            !workspacePopupElement.contains(event.target) &&
            !addBoardPopupElement?.contains(event.target)
          ) {
            // Start closing animation for workspace popup
            handleCloseWorkspace();
          }
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", checkMobile);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dispatch, workspaceTransitionState, isClosingWorkspace]);

  const handleItemClick = (title, path) => {
    dispatch(setActiveItem(title));
    navigate(`/main/${path}`);

    if (isMobile) {
      dispatch(toggleSidebar());
    }
  };

  // Handle closing workspace with animation
  const handleCloseWorkspace = () => {
    // Prevent double-closing or closing when already in closed/closing state
    if (
      isClosingWorkspace ||
      workspaceTransitionState === "closing" ||
      workspaceTransitionState === "closed"
    ) {
      return;
    }

    // Set local state flag to prevent multiple close attempts
    setIsClosingWorkspace(true);

    // Dispatch the close start action to Redux
    // This will set the state to "closing" which will trigger CSS animations
    dispatch(closeWorkspaceStart());

    // Reset the local tracking state after a delay
    // This is just for our local UI prevention logic
    setTimeout(() => {
      setIsClosingWorkspace(false);
    }, 300); // Slightly longer than animation duration for safety
  };

  const handleWorkspaceToggle = async (workspaceType, e) => {
    // Prevent navigation if event is provided
    if (e) e.preventDefault();

    try {
      // If clicking on the same workspace type that's already open, just close it
      if (isWorkspaceOpen && activeWorkspaceType === workspaceType) {
        handleCloseWorkspace();
        return;
      }

      // Get the workspace data using fetch
      const response = await fetch(
        `${BASE_URL}/api/v1/workspaces/user-workspaces`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // This is important for cookies/session
        }
      );

      const data = await response.json();

      if (data?.status === "success" && data?.data?.ownedWorkspaces) {
        // Map the workspace types to match the API
        const typeMapping = {
          workspace: "public",
          collaboration: "collaboration",
          private: "private",
        };

        const workspace = data.data.ownedWorkspaces.find(
          (w) => w.type === typeMapping[workspaceType]
        );

        if (workspace) {
          // Create workspace data object
          const workspaceData = {
            id: workspace._id,
            name: workspace.name,
            type: workspace.type,
            description: workspace.description,
          };

          // If a workspace is currently open, close it first
          if (isWorkspaceOpen) {
            // Close the current workspace
            dispatch(closeWorkspaceStart());
            // Immediately open the new workspace
            dispatch(setActiveWorkspaceType(workspaceType));
            dispatch(selectWorkspace(workspaceData));
            dispatch(openWorkspaceStart());
          } else {
            // If no workspace is open, directly open the new one
            dispatch(setActiveWorkspaceType(workspaceType));
            dispatch(selectWorkspace(workspaceData));
            dispatch(openWorkspaceStart());
          }
        }
      }
    } catch (error) {
      console.error("Error fetching workspace data:", error);
    }
  };

  // Add animation end handler
  useEffect(() => {
    const handleAnimationEnd = (e) => {
      if (e.target.classList.contains("workspace-popup")) {
        if (workspaceTransitionState === "closing") {
          // Check if there's a pending workspace to open
          const pendingWorkspace = sessionStorage.getItem("pendingWorkspace");
          if (pendingWorkspace) {
            try {
              const { type, data } = JSON.parse(pendingWorkspace);
              sessionStorage.removeItem("pendingWorkspace");

              // Open the new workspace
              dispatch(setActiveWorkspaceType(type));
              dispatch(selectWorkspace(data));
              dispatch(openWorkspaceStart());
            } catch (error) {
              console.error("Error processing pending workspace:", error);
              sessionStorage.removeItem("pendingWorkspace");
            }
          }
        }
      }
    };

    document.addEventListener("animationend", handleAnimationEnd);
    return () => {
      document.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [dispatch, workspaceTransitionState]);

  return (
    <div
      id="sidebar"
      className={`fixed z-50 left-0 top-0 bottom-0 bg-[#4D2D61] shadow-lg p-4 flex flex-col border-r border-gray-200 font-normal transition-all duration-300 
        ${isSidebarOpen ? "w-60" : "w-20"}
        ${
          isMobile
            ? isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0"
        }
        ${isMobile && "bg-opacity-30 backdrop-blur-xs"}
      `}
    >
      {/* Logo and Close Button Section */}
      <div className="relative flex items-center w-full mb-4 mt-1">
        {isSidebarOpen ? (
          <img
            src={LogoF}
            alt="Logo"
            className="h-10 transition-all duration-300"
          />
        ) : (
          <div className="flex justify-center w-full">
            <img
              src={LogoS}
              alt="Small Logo"
              className="h-8 w-10 transition-all duration-300"
            />
          </div>
        )}

        {/* Close button for mobile */}
        {isMobile && isSidebarOpen && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="ml-auto p-1 rounded-full bg-white text-[#57356A]"
          >
            <X size={18} />
          </button>
        )}

        {/* Toggle button for desktop */}
        {!isMobile && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className={`absolute ${
              isSidebarOpen ? "right-0" : "-right-7"
            } top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#57356A] transition-all duration-300 shadow-lg hover:bg-[#65437A] hover:text-white z-10`}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        )}
      </div>
      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-3" />

      {/* User Workspace Section */}
      {user && (
        <div className="mb-3">
          {isSidebarOpen ? (
            <div className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-md">
              <div className="w-6 h-6 flex items-center justify-center bg-[#6A3B82] text-[#fff] font-medium rounded-sm text-sm">
                {user.firstName.charAt(0).toUpperCase()}
              </div>

              <span className="text-sm flex-1 px-2 truncate text-white">
                {user.firstName}&apos;s Workspaces
              </span>

              <ChevronsUpDown className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[#6A3B82] text-white font-normal rounded-xl text-sm">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="mt-2 space-y-2">
            <div
              className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                activeItem === "Chat" ? "bg-white/95" : "hover:bg-white/95"
              } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
              onClick={(e) => {
                e.preventDefault();
                handleItemClick("Chat", "chat");
              }}
            >
              <div className="flex items-center gap-3">
                <ChatIcon
                  className={`h-5 w-5 ${
                    activeItem === "Chat"
                      ? "text-[#4D2D61]"
                      : "text-white group-hover:text-[#4D2D61]"
                  }`}
                />
                {isSidebarOpen && (
                  <span
                    className={`text-sm ${
                      activeItem === "Chat"
                        ? "text-[#4D2D61]"
                        : "text-white group-hover:text-[#4D2D61]"
                    }`}
                  >
                    Chat
                  </span>
                )}
              </div>
            </div>

            {/* Dashboard */}
            <div
              className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                activeItem === "Dashboard" ? "bg-white/95" : "hover:bg-white/95"
              } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
              onClick={(e) => {
                e.preventDefault();
                handleItemClick("Dashboard", "dashboard");
              }}
            >
              <div className="flex items-center gap-3">
                <DashboardIcon
                  className={`h-5 w-5 ${
                    activeItem === "Dashboard"
                      ? "text-[#4D2D61]"
                      : "text-white group-hover:text-[#4D2D61]"
                  }`}
                />
                {isSidebarOpen && (
                  <span
                    className={`text-sm ${
                      activeItem === "Dashboard"
                        ? "text-[#4D2D61]"
                        : "text-white group-hover:text-[#4D2D61]"
                    }`}
                  >
                    Dashboard
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-3" />

      {/* Navigation Items */}
      <nav
        className="space-y-2 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Workspace */}
        <div
          className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
            activeItem === "Workspace" ? "bg-white/95" : "hover:bg-white/95"
          } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
          onClick={(e) => {
            handleWorkspaceToggle("workspace", e);
          }}
        >
          <div className="flex items-center gap-3">
            <WorkspaceIcon
              className={`h-5 w-5 ${
                activeItem === "Workspace"
                  ? "text-[#4D2D61]"
                  : "text-white group-hover:text-[#4D2D61]"
              }`}
            />
            {isSidebarOpen && (
              <span
                className={`text-sm ${
                  activeItem === "Workspace"
                    ? "text-[#4D2D61]"
                    : "text-white group-hover:text-[#4D2D61]"
                }`}
              >
                Workspace
              </span>
            )}
          </div>
        </div>

        {/* Collaboration */}
        <div
          className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
            activeItem === "Collaboration" ? "bg-white/95" : "hover:bg-white/95"
          } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
          onClick={(e) => {
            handleWorkspaceToggle("collaboration", e);
          }}
        >
          <div className="flex items-center gap-3">
            <CollaborationIcon
              className={`h-5 w-5 ${
                activeItem === "Collaboration"
                  ? "text-[#4D2D61]"
                  : "text-white group-hover:text-[#4D2D61]"
              }`}
            />
            {isSidebarOpen && (
              <span
                className={`text-sm ${
                  activeItem === "Collaboration"
                    ? "text-[#4D2D61]"
                    : "text-white group-hover:text-[#4D2D61]"
                }`}
              >
                Collaboration
              </span>
            )}
          </div>
        </div>

        {/* Private */}
        <div
          className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
            activeItem === "Private" ? "bg-white/95" : "hover:bg-white/95"
          } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
          onClick={(e) => {
            handleWorkspaceToggle("private", e);
          }}
        >
          <div className="flex items-center gap-3">
            <PrivateIcon
              className={`h-5 w-5 ${
                activeItem === "Private"
                  ? "text-[#4D2D61]"
                  : "text-white group-hover:text-[#4D2D61]"
              }`}
            />
            {isSidebarOpen && (
              <span
                className={`text-sm ${
                  activeItem === "Private"
                    ? "text-[#4D2D61]"
                    : "text-white group-hover:text-[#4D2D61]"
                }`}
              >
                Private
              </span>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
