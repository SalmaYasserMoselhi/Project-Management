import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import {
  openWorkspaceStart,
  closeWorkspaceStart,
  setActiveWorkspaceType,
  selectWorkspace,
} from "../features/Slice/ComponentSlice/sidebarSlice";

const Breadcrumb = ({ customLabel }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const selectedWorkspace = useSelector(
    (state) => state.sidebar.selectedWorkspace
  );
  const userWorkspaces = useSelector(
    (state) => state.userWorkspaces.workspaces
  );
  const { isWorkspaceOpen, workspaceTransitionState, activeWorkspaceType } =
    useSelector((state) => state.sidebar);
  const [workspaceName, setWorkspaceName] = useState(null);
  const [boardName, setBoardName] = useState(null);

  if (customLabel) {
    return (
      <nav className="text-sm font-medium text-gray-600">
        <ul className="flex items-center space-x-2">
          <li>
            <span className="text-gray-500 capitalize">{customLabel}</span>
          </li>
        </ul>
      </nav>
    );
  }

  const paths = location.pathname
    .split("/")
    .filter((path) => path)
    .slice(1); // حذف أول جزء فقط

  // Check if this is a workspace settings page
  const isWorkspaceSettings =
    location.pathname.includes("/workspaces/") &&
    location.pathname.includes("/settings");

  // Check if this is a board page
  const isBoardPage =
    location.pathname.includes("/workspaces/") &&
    location.pathname.includes("/boards/");

  // Extract workspace ID and board ID from URL
  const workspaceIdFromUrl =
    isWorkspaceSettings || isBoardPage
      ? location.pathname.match(/\/workspaces\/([^\/]+)/)?.[1]
      : null;

  const boardIdFromUrl = isBoardPage
    ? location.pathname.match(/\/boards\/([^\/]+)/)?.[1]
    : null;

  // Handle opening workspace popup for boards - using same pattern as sidebar
  const handleBoardsClick = async () => {
    try {
      // If clicking on the same workspace type that's already open, just close it
      if (isWorkspaceOpen && activeWorkspaceType === "workspace") {
        dispatch(closeWorkspaceStart());
        return;
      }

      // If we have the workspace data already from the breadcrumb state
      if (selectedWorkspace && workspaceName) {
        const workspaceData = {
          id: selectedWorkspace.id || selectedWorkspace._id,
          name: workspaceName,
          type: selectedWorkspace.type,
          description: selectedWorkspace.description,
          createdBy: selectedWorkspace.createdBy,
          userRole: selectedWorkspace.userRole,
          memberCount: selectedWorkspace.memberCount,
        };

        // If a workspace is currently open, close it first
        if (isWorkspaceOpen) {
          // Close the current workspace
          dispatch(closeWorkspaceStart());
          // Store the workspace data to open after closing
          sessionStorage.setItem(
            "pendingWorkspace",
            JSON.stringify({
              type: "workspace",
              data: workspaceData,
            })
          );
        } else {
          // If no workspace is open, directly open the new one
          dispatch(setActiveWorkspaceType("workspace"));
          dispatch(selectWorkspace(workspaceData));
          dispatch(openWorkspaceStart());
        }
        return;
      }

      // Fallback: Fetch workspace data from API
      const BASE_URL = "http://localhost:3000";
      const response = await fetch(
        `${BASE_URL}/api/v1/workspaces/user-workspaces`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json();
      const workspaces = data?.data?.ownedWorkspaces || data?.data?.workspaces;

      if (data?.status === "success" && workspaces) {
        const workspace = workspaces.find(
          (w) => w._id === workspaceIdFromUrl || w.id === workspaceIdFromUrl
        );

        if (workspace) {
          const workspaceData = {
            id: workspace._id,
            name: workspace.name,
            type: workspace.type,
            description: workspace.description,
            createdBy: workspace.createdBy,
            userRole: workspace.userRole,
            memberCount: workspace.memberCount,
          };

          // If a workspace is currently open, close it first
          if (isWorkspaceOpen) {
            dispatch(closeWorkspaceStart());
            sessionStorage.setItem(
              "pendingWorkspace",
              JSON.stringify({
                type: "workspace",
                data: workspaceData,
              })
            );
          } else {
            dispatch(setActiveWorkspaceType("workspace"));
            dispatch(selectWorkspace(workspaceData));
            dispatch(openWorkspaceStart());
          }
        }
      }
    } catch (error) {
      console.error("Error opening workspace popup:", error);
    }
  };

  // Try to get workspace name from different sources
  useEffect(() => {
    if ((isWorkspaceSettings || isBoardPage) && workspaceIdFromUrl) {
      // First try from selectedWorkspace
      if (selectedWorkspace?.name) {
        setWorkspaceName(selectedWorkspace.name);
        return;
      }

      // Then try from userWorkspaces
      const workspace = userWorkspaces?.find(
        (ws) => ws._id === workspaceIdFromUrl || ws.id === workspaceIdFromUrl
      );
      if (workspace?.name) {
        setWorkspaceName(workspace.name);
        return;
      }

      // Try from localStorage
      try {
        const localWorkspace = localStorage.getItem("selectedPublicWorkspace");
        if (localWorkspace) {
          const parsed = JSON.parse(localWorkspace);
          if (
            (parsed._id === workspaceIdFromUrl ||
              parsed.id === workspaceIdFromUrl) &&
            parsed.name
          ) {
            setWorkspaceName(parsed.name);
            return;
          }
        }
      } catch (e) {
        console.error("Error reading from localStorage:", e);
      }

      // If none found, fetch from API
      const fetchWorkspaceName = async () => {
        try {
          const response = await fetch(
            `/api/v1/workspaces/${workspaceIdFromUrl}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.data?.workspace?.name) {
              setWorkspaceName(data.data.workspace.name);
            }
          }
        } catch (error) {
          console.error("Error fetching workspace:", error);
        }
      };

      fetchWorkspaceName();
    }
  }, [
    isWorkspaceSettings,
    isBoardPage,
    workspaceIdFromUrl,
    selectedWorkspace,
    userWorkspaces,
  ]);

  // Fetch board name if this is a board page
  useEffect(() => {
    if (isBoardPage && boardIdFromUrl) {
      const fetchBoardName = async () => {
        try {
          const response = await fetch(`/api/v1/boards/${boardIdFromUrl}`);
          if (response.ok) {
            const data = await response.json();
            if (data.data?.board?.name) {
              setBoardName(data.data.board.name);
            }
          }
        } catch (error) {
          console.error("Error fetching board:", error);
        }
      };

      fetchBoardName();
    }
  }, [isBoardPage, boardIdFromUrl]);

  // If it's workspace settings, show custom breadcrumb with workspace name
  if (isWorkspaceSettings) {
    return (
      <nav className="text-sm font-semibold text-gray-500">
        <ul className="flex items-center space-x-2">
          <li>
            <span className="text-gray-600 capitalize">
              {workspaceName || "Loading..."}
            </span>
          </li>
          <li className="flex items-center">
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600 capitalize">Settings</span>
          </li>
        </ul>
      </nav>
    );
  }

  // If it's a board page, show custom breadcrumb with workspace name / boards / board name
  if (isBoardPage) {
    return (
      <nav className="text-sm font-semibold text-gray-500">
        <ul className="flex items-center space-x-2">
          <li>
            <span className="text-gray-600 capitalize">
              {workspaceName || "Loading..."}
            </span>
          </li>
          <li className="flex items-center">
            <span className="mx-2 text-gray-400">/</span>
            <button
              onClick={handleBoardsClick}
              className="text-gray-600 capitalize hover:text-gray-800 transition-colors cursor-pointer"
            >
              Boards
            </button>
          </li>
          <li className="flex items-center">
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600 capitalize">
              {boardName || "Loading..."}
            </span>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav className="text-sm font-semibold text-gray-500">
      <ul className="flex items-center space-x-2">
        {paths.map((path, index) => {
          const routeTo = `/${paths.slice(0, index + 1).join("/")}`;
          const isLast = index === paths.length - 1;

          return (
            <li key={routeTo} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {isLast ? (
                <span className="text-gray-600 capitalize">
                  {path.replace(/-/g, " ")}
                </span>
              ) : (
                <Link
                  to={routeTo}
                  className="capitalize text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {path.replace(/-/g, " ")}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumb;
