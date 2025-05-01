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
  const { user } = useSelector((state) => state.user);
  const BASE_URL = "http://localhost:3000";

  // Fetch workspaces when the component mounts or when isOpen changes
  useEffect(() => {
    if (isOpen) {
      fetchWorkspaces();
    }
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

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

      if (data?.status === "success" && data?.data?.ownedWorkspaces) {
        setWorkspaces(data.data.ownedWorkspaces);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = (workspace) => {
    // Create workspace data object
    const workspaceData = {
      id: workspace._id,
      name: workspace.name,
      type: workspace.type,
      description: workspace.description,
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
    return currentWorkspace && currentWorkspace.id === workspace._id;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="absolute top-[calc(100%+1px)] left-0 right-0 bg-white rounded-lg shadow-lg z-[9999] animate-slideDown"
      style={{
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        animationDuration: "150ms",
      }}
    >
      {/* Actions Menu */}
      <div className="p-1">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
          <Settings className="w-4 h-4" />
          <span>Workspace settings</span>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
          <Users className="w-4 h-4" />
          <span>Invite members</span>
        </button>
      </div>

      <div className="px-3 py-2 border-t border-gray-100">
        <div className="text-xs font-medium text-gray-500">YOUR TEAM</div>
      </div>

      {/* Team List */}
      <div className="p-1">
        <div className="flex items-center justify-between px-3 py-2 cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center bg-[#6A3B82] text-white rounded-sm text-xs font-medium">
              {getInitial(workspaces[0]?.name)}
            </div>
            <span className="text-sm text-gray-700">{workspaces[0]?.name}</span>
          </div>
          {isCurrentWorkspace(workspaces[0]) && (
            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">
              Owner
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 cursor-pointer">
          <div className="w-5 h-5 flex items-center justify-center bg-[#6A3B82] text-white rounded-sm text-xs font-medium">
            {getInitial(workspaces[1]?.name)}
          </div>
          <span className="text-sm text-gray-700">{workspaces[1]?.name}</span>
        </div>
      </div>
    </div>
  );
};

export default UserPublicSpacesPopup;
