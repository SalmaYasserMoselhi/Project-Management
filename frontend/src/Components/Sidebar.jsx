import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import UserPublicSpacesPopup from "../Workspace/user'sPublicSpacesPopup";

import {
  toggleSidebar,
  setActiveItem,
  openWorkspaceStart,
  closeWorkspaceStart,
  setActiveWorkspaceType,
  selectWorkspace,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";
import { fetchUserPublicWorkspaces, selectShouldFetchWorkspaces } from "../features/Slice/WorkspaceSlice/userWorkspacesSlice";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  const [isWorkspacePopupOpen, setIsWorkspacePopupOpen] = useState(false);
  const BASE_URL = "http://localhost:3000";
  const [defaultPublicWorkspace, setDefaultPublicWorkspace] = useState(null);

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
  const { selectedWorkspace: popupSelectedWorkspace, workspaces: userPublicWorkspaces } = useSelector((state) => state.userWorkspaces);

  // Get selected workspace from localStorage if not in Redux
  let localStorageSelectedWorkspace = null;
  try {
    const saved = localStorage.getItem("selectedPublicWorkspace");
    if (saved) {
      localStorageSelectedWorkspace = JSON.parse(saved);
    }
  } catch {}

  // Add this at the top level
  const shouldFetch = useSelector(selectShouldFetchWorkspaces);

  // Determine if user is not the owner of the selected public workspace
  const isNotOwner = (ws) => ws && ws.type === "public" && user && ws.createdBy !== user._id;
  const hideCollabAndPrivate =
    (isNotOwner(popupSelectedWorkspace) || isNotOwner(localStorageSelectedWorkspace));

  const handleItemClick = (title, path) => {
    dispatch(setActiveItem(title));
    navigate(`/main/${path}`);

    if (isMobile) {
      dispatch(toggleSidebar());
    }
  };

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

  useEffect(() => {
    if (shouldFetch) {
      dispatch(fetchUserPublicWorkspaces());
    }
  }, [dispatch, shouldFetch]);

  // Fallbacks
  const ownedWorkspace = userPublicWorkspaces.find(w => w.userRole === "owner");

  // Sidebar header name logic
  const sidebarWorkspaceName =
    (popupSelectedWorkspace && popupSelectedWorkspace.name) ||
    (localStorageSelectedWorkspace && localStorageSelectedWorkspace.name) ||
    (ownedWorkspace && ownedWorkspace.name) ||
    (userPublicWorkspaces.length > 0 && userPublicWorkspaces[0].name) ||
    (user ? `${user.firstName}'s Workspace` : "Workspace");

  // For avatar: use selected workspace from Redux, then localStorage
  const selectedOrLocalWorkspace = popupSelectedWorkspace || localStorageSelectedWorkspace;
  const sidebarAvatarLetter = selectedOrLocalWorkspace
    ? (selectedOrLocalWorkspace.name ? selectedOrLocalWorkspace.name.charAt(0).toUpperCase() : "?")
    : (user ? user.firstName.charAt(0).toUpperCase() : "?");

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

    // Only handle for public workspaces
    if (workspaceType === "workspace") {
      // If a public workspace is already selected, open it
      if (selectedWorkspace && selectedWorkspace.type === "public") {
        dispatch(setActiveWorkspaceType("workspace"));
        dispatch(selectWorkspace(selectedWorkspace));
        dispatch(openWorkspaceStart());
        return;
      }
    }

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

      const workspaces = data?.data?.ownedWorkspaces || data?.data?.workspaces;
      if (data?.status === "success" && workspaces) {
        // Map the workspace types to match the API
        const typeMapping = {
          workspace: "public",
          collaboration: "collaboration",
          private: "private",
        };

        const workspace = workspaces.find(
          (w) => w.type === typeMapping[workspaceType]
        );

        if (workspace) {
          // Create workspace data object
          const workspaceData = {
            id: workspace._id,
            name: workspace.name,
            type: workspace.type,
            description: workspace.description,
            createdBy: workspace.createdBy,
            userRole: workspace.userRole,
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

  // Add handler for workspace popup
  const handleWorkspacePopupToggle = (e) => {
    e.stopPropagation();

    // Don't open popup if sidebar is closed
    if (!isSidebarOpen) return;

    // If a workspace popup is open, close it first
    if (isWorkspaceOpen || workspaceTransitionState === "opening") {
      handleCloseWorkspace();
      // Small delay to ensure workspace is closed before opening user's popup
      setTimeout(() => {
        setIsWorkspacePopupOpen(!isWorkspacePopupOpen);
      }, 100);
    } else {
      setIsWorkspacePopupOpen(!isWorkspacePopupOpen);
    }
  };

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
            className="h-9 transition-all duration-300"
          />
        ) : (
          <div className="flex justify-center w-full">
            <img
              src={LogoS}
              alt="Small Logo"
              className="h-8 transition-all duration-300"
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
            } top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/90 text-[#57356A] transition-all duration-300 shadow-lg hover:bg-[#65437A] hover:text-white z-10 w-5 h-5`}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={15} />
            ) : (
              <ChevronRight size={15} />
            )}
          </button>
        )}
      </div>
      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-3" />

      {/* User Workspace Section */}
      {user && (
        <div className="mb-3">
          <div className="relative">
            {isSidebarOpen ? (
              <div
                className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-md"
                onClick={handleWorkspacePopupToggle}
                data-popup-trigger="true"
              >
                <div className="w-6 h-6 flex items-center justify-center bg-[#6A3B82] text-[#fff] font-medium rounded-sm text-sm">
                  {sidebarAvatarLetter}
                </div>

                <span className="text-sm flex-1 px-2 truncate text-white">
                  {sidebarWorkspaceName}
                </span>

                <ChevronDown
                  className={`h-5 w-5 text-white transition-transform duration-200`}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  className="w-12 px-3 py-2.5 flex items-center justify-center bg-[#6A3B82] text-white font-normal rounded-xl text-sm"
                  onClick={handleWorkspacePopupToggle}
                  data-popup-trigger="true"
                >
                  {sidebarAvatarLetter}
                </div>
              </div>
            )}

            {/* Workspace Popup */}
            <UserPublicSpacesPopup
              isOpen={isWorkspacePopupOpen}
              onClose={() => setIsWorkspacePopupOpen(false)}
              currentWorkspace={selectedWorkspace}
              defaultPublicWorkspace={defaultPublicWorkspace}
            />
          </div>

          {/* Chat */}
          <div className="mt-2 space-y-2">
            <div
              className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                activeItem === "Chat" ? "bg-white/90" : "hover:bg-white/90"
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
                activeItem === "Dashboard" ? "bg-white/90" : "hover:bg-white/90"
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
        {selectedOrLocalWorkspace && user ? (
          <>
            {/* Workspace */}
            <div
              className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                activeItem === "Workspace" ? "bg-white/90" : "hover:bg-white/90"
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

            {/* Hide Collaboration and Private if not owner of selected public workspace */}
            {!hideCollabAndPrivate && (
              <>
                {/* Collaboration */}
                <div
                  className={`group flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                    activeItem === "Collaboration"
                      ? "bg-white/90"
                      : "hover:bg-white/90"
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
                    activeItem === "Private" ? "bg-white/90" : "hover:bg-white/90"
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
              </>
            )}
          </>
        ) : (
          <div style={{ height: 120 }} />
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
