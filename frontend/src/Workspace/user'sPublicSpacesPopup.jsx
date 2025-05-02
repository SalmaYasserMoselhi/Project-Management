import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setActiveWorkspaceType,
  selectWorkspace,
  closeWorkspaceStart,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import { Settings, Users } from "lucide-react";

const UserPublicSpacesPopup = ({ isOpen, onClose, currentWorkspace }) => {
  const dispatch = useDispatch();
  const popupRef = useRef(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useSelector((state) => state.user);
  const { isWorkspaceOpen, workspaceTransitionState } = useSelector(
    (state) => state.sidebar
  );
  const BASE_URL = "http://localhost:3000";

  // Global click handler to close popup
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        !e.target.closest('[data-popup-trigger="true"]')
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleGlobalClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
    };
  }, [isOpen, onClose]);

  // Fetch workspaces when the component mounts or when isOpen changes
  useEffect(() => {
    if (isOpen) {
      // Close any open workspace popup before opening this one
      if (isWorkspaceOpen || workspaceTransitionState === "opening") {
        dispatch(closeWorkspaceStart());
      }
      fetchWorkspaces();
    }
  }, [isOpen, isWorkspaceOpen, workspaceTransitionState, dispatch]);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/workspaces/public-member`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data?.status === "success" && data?.data?.workspaces) {
        // Sort workspaces to show current user's workspace first
        const sortedWorkspaces = [...data.data.workspaces]
          .sort((a, b) => {
            // If a is owned by current user and b isn't, a comes first
            if (a.userRole === "owner" && b.userRole !== "owner") return -1;
            // If b is owned by current user and a isn't, b comes first
            if (b.userRole === "owner" && a.userRole !== "owner") return 1;
            // Otherwise maintain original order
            return 0;
          })
          .map((workspace) => ({
            ...workspace,
            memberCount:
              workspace.memberCount || workspace.members?.length || 0,
          }));
        setWorkspaces(sortedWorkspaces);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = (workspace) => {
    if (!workspace) return;

    // Create workspace data object
    const workspaceData = {
      id: workspace._id,
      name: workspace.name,
      type: workspace.type,
      description: workspace.description,
      memberCount: workspace.memberCount,
    };

    // Map API workspace type to sidebar type
    const typeMapping = {
      public: "workspace",
      collaboration: "collaboration",
      private: "private",
    };

    // Select the workspace and close the popup
    dispatch(setActiveWorkspaceType(typeMapping[workspace.type]));
    dispatch(selectWorkspace(workspaceData));
    onClose();
  };

  // Get first letter of name for avatar
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  // Determine if a workspace is the current workspace
  const isCurrentWorkspace = (workspace) => {
    return (
      workspace && currentWorkspace && workspace._id === currentWorkspace.id
    );
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      ref={popupRef}
      className={`absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg z-[9999] transition-all duration-300 ease-in-out transform min-w-[300px] w-[320px] ${
        isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
      style={{
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Header with workspace info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 flex items-center justify-center bg-[#6A3B82] text-white rounded-sm text-base font-medium">
            {getInitial(currentWorkspace?.name)}
          </div>
          <div>
            <h3 className="text-gray-900 font-medium">
              {currentWorkspace?.name}
            </h3>
            <p className="text-sm text-gray-500">
              {currentWorkspace?.memberCount || 0} member
              {(currentWorkspace?.memberCount || 0) > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3 max-w-[280px]">
          <button className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded-md bg-gray-100 transition-colors w-full h-7 cursor-pointer">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded-md bg-gray-100 transition-colors h-7 w-full cursor-pointer">
            <Users className="w-3.5 h-3.5" />
            <span>Invite members</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="text-xs font-medium text-gray-500">YOUR TEAM</div>
      </div>

      {/* Team List with fixed height container */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 400px)", minHeight: "100px" }}
      >
        <div className="p-1">
          {workspaces.map((workspace, index) => (
            <div
              key={workspace?._id || index}
              className="flex items-center justify-between px-3 h-12 cursor-pointer hover:bg-gray-100 group"
              onClick={() => handleWorkspaceSelect(workspace)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 flex items-center justify-center bg-[#6A3B82] text-white rounded-sm text-xl font-medium shrink-0">
                  {getInitial(workspace?.name)}
                </div>
                <div className="min-w-0 overflow-hidden">
                  <span className="text-sm text-gray-700 block truncate">
                    {workspace?.name}
                  </span>
                </div>
              </div>
              {workspace.userRole === "owner" && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 group-hover:bg-white transition-colors shrink-0">
                  Owner
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default UserPublicSpacesPopup;
