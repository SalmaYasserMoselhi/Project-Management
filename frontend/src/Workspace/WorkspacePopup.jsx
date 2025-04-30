import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { MoreVertical, Pin, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import AddBoardPopup from "./AddBoardPopup";
import {
  openWorkspaceComplete,
  closeWorkspaceComplete,
  setActiveWorkspaceType,
  selectWorkspace,
  openWorkspaceStart,
  closeWorkspaceStart,
} from "../features/Slice/ComponentSlice/sidebarSlice";

const WorkspacePopup = ({ workspaceId, workspaceName }) => {
  const dispatch = useDispatch();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Active");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddBoardOpen, setIsAddBoardOpen] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [page, setPage] = useState(1);
  const [sortOption, setSortOption] = useState("-updatedAt");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [totalBoards, setTotalBoards] = useState(0);

  const popupRef = useRef(null);
  const backdropRef = useRef(null);
  const boardsContainerRef = useRef(null);
  const LIMIT = 10; // Number of boards to fetch per page

  // Get relevant state from Redux
  const { isSidebarOpen, workspaceTransitionState, activeWorkspaceType } =
    useSelector((state) => state.sidebar);

  // Calculate popup position based on sidebar state
  const getPopupPosition = useCallback(() => {
    return {
      left: isSidebarOpen ? 240 : 80,
    };
  }, [isSidebarOpen]);

  // Handle animation end events for proper state transitions
  const handleAnimationEnd = useCallback(
    (e) => {
      // Only process the animation events we care about
      if (e.target !== popupRef.current) return;

      if (workspaceTransitionState === "opening") {
        dispatch(openWorkspaceComplete());
      } else if (workspaceTransitionState === "closing") {
        dispatch(closeWorkspaceComplete());

        // Process any pending workspace switch
        const pendingWorkspace = sessionStorage.getItem("pendingWorkspace");
        if (pendingWorkspace) {
          try {
            const { type, data } = JSON.parse(pendingWorkspace);
            sessionStorage.removeItem("pendingWorkspace");

            dispatch(setActiveWorkspaceType(type));
            dispatch(selectWorkspace(data));

            // Small delay before starting the next opening animation
            setTimeout(() => {
              dispatch(openWorkspaceStart());
            }, 50);
          } catch (error) {
            console.error("Error processing pending workspace:", error);
            sessionStorage.removeItem("pendingWorkspace");
          }
        }
      }
    },
    [dispatch, workspaceTransitionState]
  );

  // Handle closing the workspace popup
  const handleClose = useCallback(() => {
    if (workspaceTransitionState === "open") {
      // Only dispatch the start action, let the animation end handle completion
      dispatch(closeWorkspaceStart());
    }
  }, [dispatch, workspaceTransitionState]);

  // Update popup position when sidebar state changes
  useEffect(() => {
    if (popupRef.current) {
      const { left } = getPopupPosition();
      popupRef.current.style.left = `${left}px`;
    }
  }, [isSidebarOpen, getPopupPosition]);

  // Setup animation classes based on transition state
  useEffect(() => {
    const popupElement = popupRef.current;
    const backdropElement = backdropRef.current;

    if (!popupElement || !backdropElement) return;

    // Clear any existing animation classes
    popupElement.classList.remove(
      "workspace-popup-entering",
      "workspace-popup-exiting"
    );

    backdropElement.classList.remove(
      "workspace-backdrop-entering",
      "workspace-backdrop-exiting"
    );

    // Add appropriate animation class based on current transition state
    if (workspaceTransitionState === "opening") {
      popupElement.classList.add("workspace-popup-entering");
      backdropElement.classList.add("workspace-backdrop-entering");
    } else if (workspaceTransitionState === "closing") {
      popupElement.classList.add("workspace-popup-exiting");
      backdropElement.classList.add("workspace-backdrop-exiting");
    }

    // Set up animation end listener
    popupElement.addEventListener("animationend", handleAnimationEnd);

    return () => {
      popupElement.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [workspaceTransitionState, handleAnimationEnd]);

  // Main function to fetch ALL boards at once with sorting and search
  const fetchBoards = useCallback(async () => {
    try {
      if (!workspaceId) {
        setError("Workspace not selected");
        return;
      }

      setBoards([]);
      setLoading(true);
      setError("");

      let endpoint;
      let queryParams = [];

      if (activeTab === "Archived") {
        endpoint = "/api/v1/boards/user-boards/archived";
        queryParams.push(
          `sort=${sortOption}`,
          `limit=1000` // Very high limit to get all boards
        );
      } else {
        endpoint = `/api/v1/boards/workspace/${workspaceId}/boards`;
        queryParams.push(
          `sort=${sortOption}`,
          `limit=1000` // Very high limit to get all boards
        );

        // Add search parameter if there's a search term
        if (searchTerm) {
          queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
        }
      }

      const fullUrl = `${endpoint}?${queryParams.join("&")}`;
      const response = await api.get(fullUrl);

      if (response.data?.status === "success") {
        const allBoards = response.data.data?.boards || [];
        setTotalBoards(response.data.data?.stats.total || 0);
        setBoards(allBoards);
      } else {
        setBoards([]);
      }
    } catch (err) {
      console.error("Error fetching boards:", err);
      setError(err.response?.data?.message || "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, activeTab, sortOption, searchTerm]);

  // Fetch boards when inputs change - with debouncing for search
  useEffect(() => {
    if (workspaceId) {
      const delaySearch = setTimeout(
        () => {
          fetchBoards();
        },
        searchTerm ? 500 : 0
      ); // Only delay if it's a search term change

      return () => clearTimeout(delaySearch);
    }
  }, [workspaceId, activeTab, sortOption, searchTerm, fetchBoards]);

  // Handle pinning/unpinning a board
  const handlePinBoard = async (boardId, isStarred, e) => {
    e.stopPropagation();
    try {
      const endpoint = `/api/v1/boards/user-boards/${boardId}/${
        isStarred ? "unstar" : "star"
      }`;
      const response = await api.patch(endpoint);

      if (response.data?.status === "success") {
        // Update the local state to reflect the change
        setBoards(
          boards.map((board) => {
            if (board.id === boardId) {
              return { ...board, starred: !isStarred };
            }
            return board;
          })
        );
      }
    } catch (err) {
      console.error("Error toggling board star status:", err);
      toast.error(
        err.response?.data?.message || "Failed to update board star status",
        {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#F9E4E4",
            color: "#DC2626",
            border: "1px solid #DC2626",
          },
        }
      );
    }
  };

  // Handle sort option change
  const handleSortChange = (value) => {
    setSortOption(value);
    setIsMenuOpen(false);
  };

  // Sort options menu
  const sortOptions = [
    { value: "-updatedAt", label: "Recently Updated" },
    { value: "updatedAt", label: "Oldest Updated" },
    { value: "name", label: "Name (A-Z)" },
    { value: "-name", label: "Name (Z-A)" },
    { value: "-createdAt", label: "Recently Created" },
    { value: "createdAt", label: "Oldest Created" },
  ];

  // Sort boards with starred ones first
  const sortedBoards = [...boards].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return 0;
  });

  return (
    <>
      {/* Backdrop - clicking here will close the workspace */}
      <div
        ref={backdropRef}
        className="workspace-backdrop"
        onClick={handleClose}
      />

      {/* Workspace Panel */}
      <div
        ref={popupRef}
        className="workspace-popup font-[Nunito]"
        style={{
          left: getPopupPosition().left,
        }}
      >
        {/* Fixed Header */}
        <div className="p-4 space-y-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-[#4D2D61]">{workspaceName}</h1>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search boards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-full focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61] placeholder-gray-400"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M16 10a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {["Active", "Archived"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-[#4D2D61] text-white"
                    : "text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Sort Header */}
        <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">
            All Boards ({totalBoards})
          </span>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              className="text-sm text-gray-600 hover:text-[#4D2D61] flex items-center gap-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              Sort
              <ChevronDown className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        sortOption === option.value
                          ? "bg-purple-50 text-[#4D2D61] font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Boards Container */}
        <div
          ref={boardsContainerRef}
          className="overflow-auto"
          style={{ height: "calc(100% - 250px)" }}
        >
          {loading ? (
            <div className="text-center text-gray-500 my-5">
              <div className="animate-spin h-5 w-5 border-t-2 border-[#4D2D61] rounded-full mx-auto"></div>
              <p className="mt-2">Loading boards...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 my-5">{error}</div>
          ) : sortedBoards.length === 0 ? (
            <div className="text-center text-gray-500 my-5">
              {searchTerm
                ? `No boards found matching "${searchTerm}"`
                : "No boards found in this workspace"}
            </div>
          ) : (
            <>
              {/* Board Items */}
              {sortedBoards.map((board) => (
                <div
                  key={board.id}
                  className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group cursor-pointer ${
                    board.starred ? "bg-purple-50" : ""
                  }`}
                  onClick={() => {
                    // Navigate to board (implement your navigation logic here)
                    console.log("Navigating to board:", board.id);
                  }}
                >
                  <span className="text-sm font-medium text-[#4D2D61] truncate flex-1">
                    {board.name}
                  </span>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) =>
                        handlePinBoard(board.id, board.starred, e)
                      }
                      className={`hover:text-[#6A3B82] transition-colors ${
                        board.starred
                          ? "text-[#4D2D61] opacity-100"
                          : "text-gray-400"
                      }`}
                    >
                      <Pin
                        className="w-[18px] h-[18px]"
                        fill={board.starred ? "#4D2D61" : "none"}
                      />
                    </button>
                    <MoreVertical className="w-[18px] h-[18px] text-[#4D2D61] cursor-pointer hover:text-[#6A3B82]" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Fixed Footer - Only show Add Board button if not a collaboration workspace */}
        {activeWorkspaceType !== "collaboration" && (
          <div className="p-4 mt-auto border-t border-gray-100">
            <button
              onClick={() => setIsAddBoardOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#4D2D61] hover:bg-[#6A3B82] transition-colors text-white text-sm font-semibold shadow-sm"
            >
              <div className="flex items-center justify-center bg-white rounded-full w-5 h-5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-[#4D2D61]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>
              </div>
              Add Board
            </button>
          </div>
        )}
      </div>

      {/* Add Board Popup */}
      {isAddBoardOpen && (
        <AddBoardPopup
          onClose={() => setIsAddBoardOpen(false)}
          workspaceId={workspaceId}
          fetchBoardsAgain={() => {
            setActiveTab("Active");
            setSearchTerm("");
            setPage(1);
            fetchBoards();
          }}
        />
      )}
    </>
  );
};

export default WorkspacePopup;
