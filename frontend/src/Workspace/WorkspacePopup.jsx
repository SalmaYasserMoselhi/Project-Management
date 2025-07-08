"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  MoreVertical,
  Pin,
  ChevronDown,
  Search,
  X,
  Archive,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import AddBoardPopup from "./AddBoardPopup";
import { useNavigate } from "react-router-dom";
import {
  openWorkspaceComplete,
  closeWorkspaceComplete,
  setActiveWorkspaceType,
  selectWorkspace,
  openWorkspaceStart,
  closeWorkspaceStart,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import {
  usePopupAnimation,
  setupWorkspaceAnimation,
} from "../utils/popup-animations";
import {
  fetchBoards,
  toggleBoardStar,
  archiveBoard,
  deleteBoard,
  setActiveTab,
  setSearchTerm,
  setSortOption,
  toggleIsMenuOpen,
  closeMenu,
  toggleBoardMenu,
  closeBoardMenu,
  openAddBoardPopup,
  closeAddBoardPopup,
  resetWorkspacePopup,
} from "../features/Slice/WorkspaceSlice/boardsSlice";

const styles = `
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
`;

const BoardItemSkeleton = () => (
  <div className="px-4 py-4">
    <div className="loading-skeleton h-4 w-3/4 rounded"></div>
  </div>
);

const WorkspacePopup = ({ workspaceId, workspaceName }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectedWorkspace } = useSelector((state) => state.sidebar);
  const currentWorkspaceId = workspaceId || selectedWorkspace?._id;
  const currentWorkspaceName = workspaceName || selectedWorkspace?.name;

  const {
    boards,
    loading,
    error,
    activeTab,
    searchTerm,
    sortOption,
    totalBoards,
    isMenuOpen,
    openBoardMenuId,
    isAddBoardOpen,
  } = useSelector((state) => state.boards);

  const popupRef = useRef(null);
  const backdropRef = useRef(null);
  const menuRef = useRef(null);
  const sortMenuRef = useRef(null);

  usePopupAnimation();

  const { isSidebarOpen, workspaceTransitionState } = useSelector(
    (state) => state.sidebar
  );

  const getPopupPosition = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;

    if (isSidebarOpen) {
      return { left: 240 };
    } else {
      // Responsive positioning when sidebar is closed
      if (isMobile) {
        return { left: 0 };
      } else if (isTablet) {
        return { left: 20 };
      } else {
        return { left: 80 };
      }
    }
  }, [isSidebarOpen]);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (popupRef.current) {
        const { left, width } = getPopupPosition();
        popupRef.current.style.left = `${left}px`;
        if (width) {
          popupRef.current.style.width = width;
        }
      }
    };

    // Set initial position
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getPopupPosition]);

  useEffect(() => {
    const delaySearch = setTimeout(
      () => {
        if (currentWorkspaceId) {
          dispatch(
            fetchBoards({
              workspaceId: currentWorkspaceId,
              activeTab,
              sortOption,
              searchTerm,
            })
          );
        }
      },
      searchTerm ? 500 : 0
    );
    return () => clearTimeout(delaySearch);
  }, [currentWorkspaceId, activeTab, sortOption, searchTerm, dispatch]);

  const handleAnimationEnd = useCallback(
    (transitionState) => {
      if (transitionState === "opening") dispatch(openWorkspaceComplete());
      else if (transitionState === "closing") {
        dispatch(closeWorkspaceComplete());
        dispatch(resetWorkspacePopup());
        const pendingWorkspace = sessionStorage.getItem("pendingWorkspace");
        if (pendingWorkspace) {
          try {
            const { type, data } = JSON.parse(pendingWorkspace);
            sessionStorage.removeItem("pendingWorkspace");
            dispatch(setActiveWorkspaceType(type));
            dispatch(selectWorkspace({ ...data }));
            setTimeout(() => dispatch(openWorkspaceStart()), 50);
          } catch (error) {
            console.error("Error processing pending workspace:", error);
            sessionStorage.removeItem("pendingWorkspace");
          }
        }
      }
    },
    [dispatch]
  );

  const handleClose = useCallback(() => {
    if (workspaceTransitionState === "open") dispatch(closeWorkspaceStart());
  }, [dispatch, workspaceTransitionState]);

  useEffect(() => {
    if (popupRef.current) {
      const { left, width } = getPopupPosition();
      // Small delay to ensure smooth transition when sidebar state changes
      const timer = setTimeout(() => {
        if (popupRef.current) {
          popupRef.current.style.left = `${left}px`;
          if (width) {
            popupRef.current.style.width = width;
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen, getPopupPosition]);

  useEffect(() => {
    return setupWorkspaceAnimation(
      popupRef,
      backdropRef,
      workspaceTransitionState,
      handleAnimationEnd
    );
  }, [workspaceTransitionState, handleAnimationEnd]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        dispatch(closeBoardMenu());
      }
      if (
        isMenuOpen &&
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target)
      ) {
        dispatch(closeMenu());
      }
    };
    if (openBoardMenuId || isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openBoardMenuId, isMenuOpen, dispatch]);

  const handleBoardClick = (boardId) => {
    handleClose();
    navigate(`/main/workspaces/${currentWorkspaceId}/boards/${boardId}`);
  };

  const handlePinBoard = async (e, boardId, isStarred) => {
    e.stopPropagation();
    try {
      await dispatch(toggleBoardStar({ boardId, isStarred })).unwrap();
      // Re-fetch boards to apply sorting correctly
      dispatch(
        fetchBoards({
          workspaceId: currentWorkspaceId,
          activeTab,
          sortOption,
          searchTerm,
        })
      );
    } catch (error) {
      // Error is already handled by toast in the slice, but you could add more here if needed
      console.error("Failed to toggle board star:", error);
    }
  };

  const handleArchiveBoard = (e, boardId) => {
    e.stopPropagation();
    dispatch(archiveBoard({ boardId, isArchiving: activeTab !== "Archived" }));
  };

  const handleDeleteBoard = (e, boardId) => {
    e.stopPropagation();
    dispatch(deleteBoard(boardId));
  };

  const handleSortChange = (value) => {
    dispatch(setSortOption(value));
  };

  const sortedBoards = boards;

  if (!currentWorkspaceId) return null;

  const sortOptions = [
    { value: "-updatedAt", label: "Recently Updated" },
    { value: "updatedAt", label: "Oldest Updated" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div
        ref={backdropRef}
        className="workspace-backdrop"
        onClick={handleClose}
      />
      <div
        ref={popupRef}
        className="workspace-popup"
        style={{
          left: getPopupPosition().left,
          width: getPopupPosition().width || "293px",
        }}
      >
        <div className="p-4 space-y-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-[#4D2D61]">
            {currentWorkspaceName}
          </h1>
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search boards..."
              value={searchTerm}
              onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white/80 backdrop-blur-sm rounded-xl border border-[#E5D8F6] focus:outline-none focus:ring-2 focus:ring-[#4D2D61]/20 focus:border-[#C1A7E6] text-gray-700 transition-all duration-300 hover:shadow-sm placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => dispatch(setSearchTerm(""))}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-[#4D2D61] transition-all duration-300 hover:scale-110"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {["Active", "Archived"].map((tab) => (
              <button
                key={tab}
                onClick={() => dispatch(setActiveTab(tab))}
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
        <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">
            All Boards ({totalBoards})
          </span>
          {activeTab !== "Archived" && (
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => dispatch(toggleIsMenuOpen())}
                className="flex items-center text-sm text-gray-600 hover:text-[#4D2D61] bg-transparent hover:bg-gray-100 py-1 px-2 rounded transition-colors"
              >
                Sort
                <ChevronDown className="w-4 h-4 ml-1" />
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
          )}
        </div>
        <div className="overflow-auto" style={{ height: "calc(100% - 250px)" }}>
          {loading ? (
            <div className="py-2">
              <BoardItemSkeleton />
              <BoardItemSkeleton />
              <BoardItemSkeleton />
              <BoardItemSkeleton />
              <BoardItemSkeleton />
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
              {sortedBoards.map((board) => (
                <div
                  key={board.id}
                  className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group cursor-pointer ${
                    board.starred ? "bg-purple-50" : ""
                  }`}
                  onClick={() => handleBoardClick(board.id)}
                >
                  <span className="text-sm font-medium text-[#4D2D61] truncate flex-1">
                    {board.name}
                  </span>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeTab !== "Archived" && (
                      <button
                        onClick={(e) =>
                          handlePinBoard(e, board.id, board.starred)
                        }
                        className={`hover:text-[#6a3b82] transition-colors ${
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
                    )}
                    <div
                      className="relative"
                      ref={openBoardMenuId === board.id ? menuRef : null}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(toggleBoardMenu(board.id));
                        }}
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <MoreVertical className="w-[18px] h-[18px] text-[#4D2D61] cursor-pointer hover:text-[#6a3b82]" />
                      </button>
                      {openBoardMenuId === board.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-20 border border-gray-100 text-sm">
                          <ul className="py-1">
                            <li>
                              <button
                                onClick={(e) => handleArchiveBoard(e, board.id)}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                              >
                                <Archive size={16} />
                                <span>
                                  {activeTab === "Archived"
                                    ? "Restore"
                                    : "Archive"}
                                </span>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={(e) => handleDeleteBoard(e, board.id)}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        {activeTab !== "Archived" &&
          currentWorkspaceName !== "Collaboration Space" && (
            <div className="p-4 mt-auto border-t border-gray-100">
              <button
                onClick={() => dispatch(openAddBoardPopup())}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px]"
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
      {isAddBoardOpen && (
        <AddBoardPopup
          onClose={() => dispatch(closeAddBoardPopup())}
          workspaceId={currentWorkspaceId}
          fetchBoardsAgain={() =>
            dispatch(
              fetchBoards({
                workspaceId: currentWorkspaceId,
                activeTab: "Active",
                sortOption: "-updatedAt",
                searchTerm: "",
              })
            )
          }
        />
      )}
    </>
  );
};

export default WorkspacePopup;
