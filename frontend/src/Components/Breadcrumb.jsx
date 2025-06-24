import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import {
  openWorkspaceStart,
  closeWorkspaceStart,
  setActiveWorkspaceType,
  selectWorkspace,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import Skeleton from "./Skeleton";

const Breadcrumb = ({ customLabel }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const userWorkspaces = useSelector(
    (state) => state.userWorkspaces.workspaces
  );
  const { isWorkspaceOpen, activeWorkspaceType } = useSelector(
    (state) => state.sidebar
  );
  const [workspaceName, setWorkspaceName] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);
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
    .slice(1);

  const isWorkspaceSettings =
    location.pathname.includes("/workspaces/") &&
    location.pathname.includes("/settings");

  const isBoardPage =
    location.pathname.includes("/workspaces/") &&
    location.pathname.includes("/boards/");

  const workspaceIdFromUrl =
    isWorkspaceSettings || isBoardPage
      ? location.pathname.match(/\/workspaces\/([^\/]+)/)?.[1]
      : null;

  const boardIdFromUrl = isBoardPage
    ? location.pathname.match(/\/boards\/([^\/]+)/)?.[1]
    : null;

  const handleBoardsClick = async () => {
    try {
      if (isWorkspaceOpen && activeWorkspaceType === "workspace") {
        dispatch(closeWorkspaceStart());
        return;
      }

      if (workspaceData) {
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
        return;
      }

      if (workspaceIdFromUrl) {
        try {
          const response = await fetch(
            `/api/v1/workspaces/${workspaceIdFromUrl}`
          );
          if (response.ok) {
            const data = await response.json();
            const workspace = data.data?.workspace;
            if (workspace) {
              const wsData = {
                id: workspace._id,
                name: workspace.name,
                type: workspace.type,
                description: workspace.description,
                createdBy: workspace.createdBy,
                userRole: workspace.userRole,
                memberCount: workspace.memberCount,
              };

              if (isWorkspaceOpen) {
                dispatch(closeWorkspaceStart());
                sessionStorage.setItem(
                  "pendingWorkspace",
                  JSON.stringify({
                    type: "workspace",
                    data: wsData,
                  })
                );
              } else {
                dispatch(setActiveWorkspaceType("workspace"));
                dispatch(selectWorkspace(wsData));
                dispatch(openWorkspaceStart());
              }
            }
          }
        } catch (error) {
          console.error("Error fetching workspace for popup:", error);
        }
      }
    } catch (error) {
      console.error("Error opening workspace popup:", error);
    }
  };

  useEffect(() => {
    const fetchBoardAndWorkspace = async () => {
      if (isBoardPage && boardIdFromUrl) {
        try {
          const response = await fetch(`/api/v1/boards/${boardIdFromUrl}`);
          if (response.ok) {
            const data = await response.json();
            if (data.data?.board) {
              const board = data.data.board;
              setBoardName(board.name);
              if (board.workspace && board.workspace.name) {
                setWorkspaceName(board.workspace.name);
                setWorkspaceData({
                  id: board.workspace._id,
                  name: board.workspace.name,
                  type: board.workspace.type,
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching board:", error);
        }
      }
    };

    const fetchWorkspace = async () => {
      if (isWorkspaceSettings && workspaceIdFromUrl) {
        const workspace = userWorkspaces?.find(
          (ws) => ws._id === workspaceIdFromUrl || ws.id === workspaceIdFromUrl
        );
        if (workspace?.name) {
          setWorkspaceName(workspace.name);
          return;
        }
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
      }
    };

    // Always fetch board data when boardIdFromUrl changes
    if (isBoardPage && boardIdFromUrl) {
      fetchBoardAndWorkspace();
    }
    
    // Only fetch workspace data if we don't have it yet
    if (!workspaceName) {
      fetchWorkspace();
    }
  }, [
    isBoardPage,
    boardIdFromUrl,
    isWorkspaceSettings,
    workspaceIdFromUrl,
    userWorkspaces,
    workspaceName,
  ]);

  // Reset board name when board ID changes
  useEffect(() => {
    if (isBoardPage && boardIdFromUrl) {
      setBoardName(null); // Reset to show loading state
    }
  }, [boardIdFromUrl, isBoardPage]);

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

  if (isBoardPage) {
    return (
      <nav className="text-sm font-semibold text-gray-500">
        <ul className="flex items-center space-x-2">
          <li>
            {workspaceName ? (
              <span className="text-gray-600 capitalize">{workspaceName}</span>
            ) : (
              <Skeleton className="h-5 w-24" />
            )}
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
            {boardName ? (
              <span className="text-gray-600 capitalize">{boardName}</span>
            ) : (
              <Skeleton className="h-5 w-32" />
            )}
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
