import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  setActiveWorkspaceType,
  selectWorkspace,
  closeWorkspaceStart,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import { Settings, Users } from "lucide-react";
import {
  fetchUserPublicWorkspaces,
  selectUserWorkspace,
  setSearchTerm,
  setSortOption,
  selectShouldFetchWorkspaces,
} from "../features/Slice/WorkspaceSlice/userWorkspacesSlice";

const UserPublicSpacesPopup = ({ isOpen, onClose, currentWorkspace }) => {
  const dispatch = useDispatch();
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const { isWorkspaceOpen, workspaceTransitionState } = useSelector(
    (state) => state.sidebar
  );
  const {
    workspaces,
    loading,
    error,
    isAnimating,
    searchTerm,
    sortOption,
    selectedWorkspace: popupSelectedWorkspace,
  } = useSelector((state) => state.userWorkspaces);

  // Add this at the top level
  const shouldFetch = useSelector(selectShouldFetchWorkspaces);

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

  // Update the fetch effect to use centralized logic
  useEffect(() => {
    if (isOpen && shouldFetch) {
      dispatch(fetchUserPublicWorkspaces());
    }
  }, [dispatch, isOpen, shouldFetch]);

  // Restore selected workspace from localStorage after workspaces are loaded
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && user) {
      const saved = localStorage.getItem("selectedPublicWorkspace");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Check if the saved workspace exists in the loaded list
          const exists = workspaces.some(ws => ws._id === parsed._id);
          if (exists) {
            dispatch({ type: "userWorkspaces/selectUserWorkspace/fulfilled", payload: parsed });
          } else {
            // If not valid, set default to owned workspace
            const ownedWorkspace = workspaces.find(ws => ws.userRole === "owner" && ws.createdBy === user._id);
            if (ownedWorkspace) {
              const workspaceData = {
                id: ownedWorkspace._id,
                name: ownedWorkspace.name,
                type: ownedWorkspace.type,
                description: ownedWorkspace.description,
                memberCount: ownedWorkspace.memberCount,
                createdBy: ownedWorkspace.createdBy,
                userRole: ownedWorkspace.userRole,
              };
              localStorage.setItem("selectedPublicWorkspace", JSON.stringify(workspaceData));
              dispatch({ type: "userWorkspaces/selectUserWorkspace/fulfilled", payload: workspaceData });
            } else {
              localStorage.removeItem("selectedPublicWorkspace");
            }
          }
        } catch {
          localStorage.removeItem("selectedPublicWorkspace");
        }
      } else {
        // If no workspace is saved, set the owned workspace as default
        const ownedWorkspace = workspaces.find(ws => ws.userRole === "owner" && ws.createdBy === user._id);
        if (ownedWorkspace) {
          const workspaceData = {
            id: ownedWorkspace._id,
            name: ownedWorkspace.name,
            type: ownedWorkspace.type,
            description: ownedWorkspace.description,
            memberCount: ownedWorkspace.memberCount,
            createdBy: ownedWorkspace.createdBy,
            userRole: ownedWorkspace.userRole,
          };
          localStorage.setItem("selectedPublicWorkspace", JSON.stringify(workspaceData));
          dispatch({ type: "userWorkspaces/selectUserWorkspace/fulfilled", payload: workspaceData });
        }
      }
    }
  }, [workspaces, dispatch, user]);

  const handleWorkspaceSelect = async (workspace) => {
    if (!workspace) return;

    try {
      // Only save to localStorage if it's a public workspace
      if (workspace.type === "public") {
        localStorage.setItem("selectedPublicWorkspace", JSON.stringify(workspace));
      }

      // Select the workspace in userWorkspaces slice
      const resultAction = await dispatch(selectUserWorkspace(workspace));
      if (selectUserWorkspace.fulfilled.match(resultAction)) {
        const workspaceData = resultAction.payload;

        // Map API workspace type to sidebar type
        const typeMapping = {
          public: "workspace",
          collaboration: "collaboration",
          private: "private",
        };

        // Only update the sidebar workspace if it's a public workspace
        if (workspace.type === "public") {
          dispatch(setActiveWorkspaceType(typeMapping[workspace.type]));
          dispatch(selectWorkspace(workspaceData));
        }
        onClose();
      }
    } catch (error) {
      console.error("Error selecting workspace:", error);
    }
  };

  // Get first letter of name for avatar
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };


  // Prefer the owned workspace as default
  const ownedWorkspace = workspaces.find(
    (workspace) => workspace.userRole === "owner"
  );
  const workspaceToShow =
    ownedWorkspace ||
    (workspaces.length > 0 ? workspaces[0] : null);

  // Get selected workspace from localStorage if not in Redux
  let localStorageSelectedWorkspace = null;
  try {
    const saved = localStorage.getItem("selectedPublicWorkspace");
    if (saved) {
      localStorageSelectedWorkspace = JSON.parse(saved);
    }
  } catch {}

  // For avatar and member count: use selected workspace from Redux, then localStorage
  const selectedOrLocalWorkspace = popupSelectedWorkspace || localStorageSelectedWorkspace;
  const avatarLetter = selectedOrLocalWorkspace
    ? getInitial(selectedOrLocalWorkspace.name)
    : (user ? user.firstName.charAt(0).toUpperCase() : "?");
  const memberCount = selectedOrLocalWorkspace?.memberCount || 0;

  // Sidebar header name logic for popup
  const popupHeaderWorkspaceName =
    (popupSelectedWorkspace && popupSelectedWorkspace.name) ||
    (localStorageSelectedWorkspace && localStorageSelectedWorkspace.name) ||
    (ownedWorkspace && ownedWorkspace.name) ||
    (workspaces.length > 0 && workspaces[0].name) ||
    (user ? `${user.firstName}'s Workspace` : "Workspace");

  const workspaceHeader = popupSelectedWorkspace
    || localStorageSelectedWorkspace
    || ownedWorkspace
    || (workspaces.length > 0 ? workspaces[0] : null);

  // console.log('Popup header workspace:', workspaceHeader);

  // Only show settings if user is owner or admin
  const canEditSettings = selectedOrLocalWorkspace && ["owner", "admin"].includes(selectedOrLocalWorkspace.userRole);

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
            {avatarLetter}
          </div>
          <div>
            <h3 className="text-gray-900 font-medium">
              {loading ? (localStorageSelectedWorkspace?.name || (
                <span className="h-5 w-32 bg-gray-200 rounded animate-pulse inline-block"></span>
              )) : popupHeaderWorkspaceName}
            </h3>
            <p className="text-sm text-gray-500">
              {loading ? memberCount : workspaceHeader?.memberCount || 0} member
              {(loading ? memberCount : workspaceHeader?.memberCount || 0) > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3 max-w-[280px]">
          {canEditSettings && (
            <button
              className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded-md bg-gray-100 transition-colors w-full h-7 cursor-pointer"
              onClick={() => {
                if (selectedOrLocalWorkspace) {
                  navigate(`/main/workspaces/${selectedOrLocalWorkspace.id || selectedOrLocalWorkspace._id}/settings`);
                  onClose();
                }
              }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          )}
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
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-5 w-5 border-t-2 border-[#4D2D61] rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading workspaces...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">{error}</div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No workspaces found</div>
          ) : (
            workspaces.map((workspace, index) => (
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
            ))
          )}
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
