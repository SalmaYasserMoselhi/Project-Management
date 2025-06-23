"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Column from "./Column";
import AddListButton from "./AddListButton";
import Calendar from "../Calendar/Calendar";
import AddMeetingModal from "../Calendar/AddMeetingModal";
import { useSelector, useDispatch } from "react-redux";
import { openMeetingModal } from "../features/Slice/MeetingSlice/meetingModalSlice";
import {
  Check,
  ChevronDown,
  ChevronRight,
  X,
  ArrowUp,
  ArrowDown,
  User,
} from "lucide-react";
import { useLocation } from "react-router-dom";

const styles = `
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Entrance animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0,0,0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(77, 45, 97, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(77, 45, 97, 0.6);
  }
}

/* Animation classes */
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

.animate-slide-in-left {
  animation: slideInLeft 0.5s ease-out forwards;
}

.animate-pulse-soft {
  animation: pulse 2s ease-in-out infinite;
}

.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}

.animate-bounce-gentle {
  animation: bounce 0.6s ease-out;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Hover and interaction effects */
.card-hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-hover:hover {
  box-shadow: 0 4px 16px rgba(77, 45, 97, 0.10);
  background-color: #faf9fc;
  border-color: #bda4e6;
  transform: scale(1.025);
  z-index: 10;
}

.button-hover {
  transition: all 0.2s ease-out;
}

.button-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(77, 45, 97, 0.2);
}

.button-hover:active {
  transform: translateY(0);
}

.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

/* Staggered animation delays */
.stagger-1 { animation-delay: 0.1s; opacity: 0; }
.stagger-2 { animation-delay: 0.2s; opacity: 0; }
.stagger-3 { animation-delay: 0.3s; opacity: 0; }
.stagger-4 { animation-delay: 0.4s; opacity: 0; }
.stagger-5 { animation-delay: 0.5s; opacity: 0; }
.stagger-6 { animation-delay: 0.6s; opacity: 0; }
`;

// Skeleton components for board loading
const BoardHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row justify-between items-center mb-6">
    <div className="flex items-center gap-6 mb-4 md:mb-0">
      <div className="loading-skeleton h-8 w-16"></div>
      <div className="loading-skeleton h-8 w-20"></div>
    </div>
    <div className="flex gap-4">
      <div className="loading-skeleton h-8 w-24 rounded-md"></div>
      <div className="loading-skeleton h-8 w-24 rounded-md"></div>
    </div>
  </div>
);

const ColumnSkeleton = () => (
  <div className="min-w-[300px] h-full">
    <div className="bg-[#F8F9FA] rounded-lg p-4 h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4">
        <div className="loading-skeleton h-6 w-32"></div>
        <div className="loading-skeleton h-6 w-6 rounded"></div>
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="loading-skeleton h-4 w-3/4 mb-2"></div>
            <div className="loading-skeleton h-3 w-1/2 mb-3"></div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <div className="loading-skeleton h-5 w-12 rounded-full"></div>
                <div className="loading-skeleton h-5 w-16 rounded-full"></div>
              </div>
              <div className="flex -space-x-1">
                <div className="loading-skeleton w-6 h-6 rounded-full"></div>
                <div className="loading-skeleton w-6 h-6 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add card button skeleton */}
      <div className="mt-4">
        <div className="loading-skeleton h-10 w-full rounded-lg"></div>
      </div>
    </div>
  </div>
);

const BoardLoadingSkeleton = () => (
  <div className="pb-6 min-h-screen flex flex-col item-center overflow-y-auto">
    <style>{styles}</style>
    <div className="border-2 border-[#C7C7C7] p-4 rounded-xl h-full flex flex-col">
      {/* Header skeleton with staggered animation */}
      <div className="animate-fade-in-up stagger-1">
        <BoardHeaderSkeleton />
      </div>

      {/* Loading indicator */}
      <div className="flex justify-center items-center p-4 mb-4 animate-fade-in-up stagger-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4d2d61] animate-pulse-soft"></div>
      </div>

      {/* Board columns skeleton */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="flex gap-4 min-w-0 h-full overflow-x-auto max-w-full">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`animate-fade-in-up stagger-${index + 3}`}
            >
              <ColumnSkeleton />
            </div>
          ))}

          {/* Add list button skeleton */}
          <div className="animate-fade-in-up stagger-6">
            <div className="min-w-[300px]">
              <div className="loading-skeleton h-12 w-full rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Board = ({
  workspaceId,
  boardId,
  restoredCard,
  boardData,
  loadingBoard,
}) => {
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const dispatch = useDispatch();
  const BASE_URL = "http://localhost:3000";
  const [lists, setLists] = useState([]);
  const [view, setView] = useState("board");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedListId, setDraggedListId] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [boardMembers, setBoardMembers] = useState([]);

  // Sort state
  const [selectedSort, setSelectedSort] = useState("date");
  const [appliedSort, setAppliedSort] = useState("date");
  const [tempSort, setTempSort] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [appliedSortDirection, setAppliedSortDirection] = useState("desc");
  const [tempSortDirection, setTempSortDirection] = useState("desc");

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState("date");
  const [activeFilterSubmenu, setActiveFilterSubmenu] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    assignedMember: null,
    priority: null,
    dueDate: null,
  });
  const [tempFilters, setTempFilters] = useState({
    assignedMember: null,
    priority: null,
    dueDate: null,
  });

  useEffect(() => {
    if (boardData && boardData.members) {
      const validMembers = boardData.members.filter((member) => member);
      setBoardMembers(validMembers);
    }
  }, [boardData]);

  const sortRef = useRef(null);
  const filterRef = useRef(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetCardId = searchParams.get("cardId");

  const onListRestored = useCallback(
    (data) => {
      const { list: restoredList, lists: allLists } = data;
      console.log("[Board.jsx] List restored via event:", data);

      setColumns((prevColumns) => {
        const updatedColumns = allLists.map((list) => {
          if (list._id === restoredList._id) {
            return { ...restoredList, id: restoredList._id };
          }
          const existingColumn = prevColumns.find(
            (c) => (c.id || c._id) === list._id
          );
          return {
            ...list,
            id: list._id,
            cards: existingColumn ? existingColumn.cards : [],
          };
        });
        return updatedColumns;
      });

      toast.success("List restored successfully");
    },
    [setColumns]
  );

  useEffect(() => {
    const handleListRestoredEvent = (event) => {
      onListRestored(event.detail);
    };
    window.addEventListener("listRestored", handleListRestoredEvent);

    return () => {
      window.removeEventListener("listRestored", handleListRestoredEvent);
    };
  }, [onListRestored]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sortRef.current &&
        !sortRef.current.contains(event.target) &&
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
        setIsSortOpen(false);
        setIsFilterOpen(false);
        setTempSort(selectedSort);
        setTempSortDirection(sortDirection);
        setTempFilters(activeFilters);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSort, sortDirection, activeFilters]);

  useEffect(() => {
    if (restoredCard) {
      onCardRestored(restoredCard);
    }
  }, [restoredCard]);

  // Use boardData instead of fetching lists separately
  useEffect(() => {
    if (boardData && boardData.lists) {
      console.log(
        "[Board.jsx] ✅ Using optimized board data for lists:",
        boardData.lists
      );
      // Filter out archived lists
      const activeLists = boardData.lists.filter((list) => !list.archived);
      console.log("[Board.jsx] Filtered active lists:", activeLists);
      setColumns(activeLists);
      setLoading(false);
    } else if (!loadingBoard && !boardData) {
      // Fallback to fetching lists if boardData is not available
      console.log("[Board.jsx] ⚠️ Fallback: Fetching lists separately");
      const fetchLists = async () => {
        try {
          console.log(
            `[Board.jsx] Fallback: Fetching lists for board ${boardId}`
          );
          const res = await axios.get(
            `${BASE_URL}/api/v1/lists/board/${boardId}/lists`
          );
          console.log("[Board.jsx] Fetched lists response:", res.data);

          // Filter out archived lists
          const activeLists = res.data.data.lists.filter(
            (list) => !list.archived
          );
          console.log("[Board.jsx] Filtered active lists:", activeLists);

          setColumns(activeLists);
        } catch (error) {
          console.error("[Board.jsx] Error fetching lists:", error);
          toast.error("Failed to load board lists");
        } finally {
          setLoading(false);
        }
      };

      if (boardId) fetchLists();
    }
  }, [boardData, loadingBoard, boardId]);

  useEffect(() => {
    setTempSort(selectedSort);
    setTempSortDirection(sortDirection);
    setTempFilters(activeFilters);
  }, []);

  const handleListDrop = async (e, targetCol) => {
    e.preventDefault();
    const draggedType = e.dataTransfer.getData("type");
    const newDraggedListId = e.dataTransfer.getData("listId");
    if (draggedType !== "list" || !newDraggedListId) {
      setDraggedListId(null);
      setDropIndex(null);
      return;
    }

    const targetListId = targetCol.id || targetCol._id;
    if (newDraggedListId === targetListId) {
      setDraggedListId(null);
      setDropIndex(null);
      return;
    }

    const draggedIndex = columns.findIndex(
      (col) => (col.id || col._id) === newDraggedListId
    );
    const targetIndex = columns.findIndex(
      (col) => (col.id || col._id) === targetListId
    );
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedListId(null);
      setDropIndex(null);
      return;
    }

    const updatedColumns = [...columns];
    const [moved] = updatedColumns.splice(draggedIndex, 1);
    updatedColumns.splice(targetIndex, 0, moved);
    setColumns(updatedColumns);
    setDraggedListId(null);
    setDropIndex(null);

    try {
      await axios.patch(
        `${BASE_URL}/api/v1/lists/${newDraggedListId}/reorder`,
        { position: targetIndex },
        { withCredentials: true }
      );
      toast.success("List reordered");
    } catch (err) {
      console.error("[Board.jsx] Error reordering list:", err);
      toast.error("Failed to reorder list");
      // Revert optimistic update
      const revertedColumns = [...columns];
      const [reverted] = revertedColumns.splice(targetIndex, 1);
      revertedColumns.splice(draggedIndex, 0, reverted);
      setColumns(revertedColumns);
    }
  };

  const handleListDragStart = (e, listId) => {
    e.dataTransfer.setData("type", "list");
    e.dataTransfer.setData("listId", listId);
    setDraggedListId(listId);
  };

  const handleListDragOver = (e, index) => {
    e.preventDefault();
    if (dropIndex !== index) {
      setDropIndex(index);
    }
  };

  const handleListDragEnd = () => {
    setDraggedListId(null);
    setDropIndex(null);
  };

  const handleArchiveList = async (listId) => {
    try {
      setLoading(true);
      console.log(`[Board.jsx] Attempting to archive list ${listId}`);
      const res = await axios.patch(
        `${BASE_URL}/api/v1/lists/${listId}/archive`,
        { archived: true },
        { withCredentials: true }
      );

      console.log(`[Board.jsx] Archive response for list ${listId}:`, res);

      if (res.status === 200 || res.status === 204) {
        console.log(`[Board.jsx] List ${listId} archived successfully`);
        // Remove the archived list from state
        setLists((prevLists) => {
          const updatedLists = prevLists.filter(
            (list) => (list._id || list.id) !== listId
          );
          console.log(
            `[Board.jsx] Updated lists after archiving:`,
            updatedLists
          );
          return updatedLists;
        });
        setColumns((prevColumns) => {
          const updatedColumns = prevColumns.filter(
            (col) => (col._id || col.id) !== listId
          );
          console.log(
            `[Board.jsx] Updated columns after archiving:`,
            updatedColumns
          );
          return updatedColumns;
        });
        toast.success("List archived successfully");
      } else {
        console.warn(
          `[Board.jsx] Unexpected response status ${res.status} for list ${listId}`,
          res.data
        );
        toast.error(
          `Unexpected response (status ${res.status}) when archiving list`
        );
      }
    } catch (err) {
      console.error(
        `[Board.jsx] Error archiving list ${listId}:`,
        err.response || err
      );
      // Handle "already archived" case
      if (err.response?.data?.message?.includes("already archived")) {
        console.log(
          `[Board.jsx] List ${listId} is already archived, removing from UI`
        );
        setLists((prevLists) =>
          prevLists.filter((list) => (list._id || list.id) !== listId)
        );
        setColumns((prevColumns) =>
          prevColumns.filter((col) => (col._id || col.id) !== listId)
        );
        toast.warning("List is already archived");
      } else {
        toast.error(
          `Failed to archive list: ${
            err.response?.data?.message || err.message
          }`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const updateColumnsWithCards = (cardsByList, sortBy = "position") => {
    console.log("[Board.jsx] Received cardsByList:", cardsByList);
    console.log("[Board.jsx] Current columns:", columns);
    const updatedColumns = columns.map((col) => {
      const listData = cardsByList.find(
        (list) => list.listId === col.id || list.listId === col._id
      );
      console.log(`[Board.jsx] Mapping listId ${col.id || col._id}:`, listData);
      return { ...col, cards: listData ? listData.cards : col.cards || [] };
    });
    console.log("[Board.jsx] Updated columns:", updatedColumns);
    setColumns(updatedColumns);

    updatedColumns.forEach((col) => {
      console.log(
        `[Board.jsx] Dispatching refreshList for listId: ${
          col.id || col._id
        }, sortBy: ${sortBy}, cards:`,
        col.cards
      );
      const event = new CustomEvent("refreshList", {
        detail: { listId: col.id || col._id, sortBy, cards: col.cards || [] },
      });
      window.dispatchEvent(event);
    });
  };

  const onCardRestored = (restoredCard) => {
    console.log("[Board.jsx] Card restored:", restoredCard);
    const listId = restoredCard.list?._id || restoredCard.list;
    if (!listId) {
      console.error("[Board.jsx] Restored card has no listId:", restoredCard);
      return;
    }

    setColumns((prevColumns) => {
      const newColumns = prevColumns.map((col) => {
        if ((col.id || col._id) === listId) {
          // Add card if it doesn't exist
          const cardExists = (col.cards || []).some(
            (c) => (c._id || c.id) === (restoredCard._id || restoredCard.id)
          );
          if (!cardExists) {
            const newCards = [...(col.cards || []), restoredCard];
            // Sort cards by position
            newCards.sort((a, b) => a.position - b.position);
            return { ...col, cards: newCards };
          }
        }
        return col;
      });
      return newColumns;
    });

    // Dispatch an event to notify the specific column to refresh.
    const event = new CustomEvent("refreshList", {
      detail: { listId: listId },
    });
    window.dispatchEvent(event);

    toast.success("Card restored successfully");
  };

  const fetchSortedByPriority = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/v1/cards/board/${boardId}/priority-sorted`
      );
      console.log("[Board.jsx] Priority sorted response:", res.data);
      let cardsByList = res.data.data.cardsByList || [];
      if (!cardsByList.length) {
        console.warn(
          "[Board.jsx] No cards returned for priority sort, keeping existing cards"
        );
        cardsByList = columns.map((col) => ({
          listId: col.id || col._id,
          listName: col.name,
          cards: col.cards || [],
        }));
      }
      updateColumnsWithCards(cardsByList, "priority");
      setSelectedSort("priority");
      setAppliedSort("priority");
    } catch (error) {
      console.error(
        "[Board.jsx] Error fetching sorted cards by priority:",
        error
      );
      toast.error("Failed to sort cards by priority");
    } finally {
      setIsSortOpen(false);
    }
  };

  const fetchSortedByDate = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/v1/lists/board/${boardId}/lists`
      );
      console.log(
        "[Board.jsx] Default sorted response (by date/position):",
        res.data
      );
      const cardsByList = res.data.data.lists.map((list) => ({
        listId: list._id,
        listName: list.name,
        cards: list.cards || [],
      }));
      updateColumnsWithCards(cardsByList, "date");
      setSelectedSort("date");
      setAppliedSort("date");
    } catch (error) {
      console.error("[Board.jsx] Error fetching sorted cards by date:", error);
      toast.error("Failed to sort by date");
    } finally {
      setIsSortOpen(false);
    }
  };

  const applySort = () => {
    setSelectedSort(tempSort);
    setSortDirection(tempSortDirection);
    setAppliedSort(tempSort);
    setAppliedSortDirection(tempSortDirection);

    if (tempSort === "priority") {
      fetchSortedByPriority();
    } else if (tempSort === "date") {
      fetchSortedByDate();
    }

    toast.success(
      `Sort applied: ${tempSort === "date" ? "Due Date" : "Priority"} (${
        tempSortDirection === "asc" ? "Ascending" : "Descending"
      })`
    );
    setIsSortOpen(false);
  };

  const cancelSort = () => {
    setTempSort(selectedSort);
    setTempSortDirection(sortDirection);
    setIsSortOpen(false);
  };

  const handleFilterByPriority = async (priority) => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/v1/cards/board/${boardId}/priority/${priority}`
      );
      console.log(`[Board.jsx] Filter by ${priority} response:`, res.data);
      let cardsByList = [];
      if (res.data.data.cards && res.data.data.cards.length) {
        cardsByList = columns.map((col) => {
          console.log(
            `[Board.jsx] Checking list ${col.id || col._id} (${
              col.name
            }) with col.id:`,
            col.id,
            "col._id:",
            col._id
          );
          const filteredCards = res.data.data.cards.filter((card) => {
            const cardListId = card.list?._id || card.list?.id;
            console.log(
              `[Board.jsx] Card ${card.id || card._id} list:`,
              card.list,
              "cardListId:",
              cardListId
            );
            return cardListId === (col.id || col._id);
          });
          console.log(
            `[Board.jsx] Filtered cards for list ${col.id || col._id} (${
              col.name
            }):`,
            filteredCards
          );
          return {
            listId: col.id || col._id,
            listName: col.name,
            cards: filteredCards,
          };
        });
      } else {
        console.warn(`[Board.jsx] No cards found for priority ${priority}`);
        cardsByList = columns.map((col) => ({
          listId: col.id || col._id,
          listName: col.name,
          cards: [],
        }));
      }
      console.log(
        "[Board.jsx] Transformed cardsByList for filter:",
        cardsByList
      );
      updateColumnsWithCards(cardsByList, "priority");
      setSelectedFilter(`priority-${priority}`);
      return true;
    } catch (error) {
      console.error(
        `[Board.jsx] Error filtering cards by ${priority} priority:`,
        error
      );
      toast.error(`Failed to filter by ${priority} priority`);
      return false;
    }
  };

  const handleFilterByDate = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/v1/lists/board/${boardId}/lists`
      );
      console.log("[Board.jsx] Filter by date response:", res.data);
      const cardsByList = res.data.data.lists.map((list) => {
        console.log(
          `[Board.jsx] Cards for list ${list._id} (${list.name}):`,
          list.cards || []
        );
        return {
          listId: list._id,
          listName: list.name,
          cards: list.cards || [],
        };
      });
      console.log(
        "[Board.jsx] Transformed cardsByList for date filter:",
        cardsByList
      );
      updateColumnsWithCards(cardsByList, "position");
      setSelectedFilter("date");
      return true;
    } catch (error) {
      console.error("[Board.jsx] Error filtering cards by date:", error);
      toast.error("Failed to filter by date");
      return false;
    }
  };

  const handleFilterByAssignedMember = async (memberId) => {
    try {
      console.log(`[Board.jsx] Filtering by assigned member: ${memberId}`);
      return true;
    } catch (error) {
      console.error(`[Board.jsx] Error filtering by assigned member:`, error);
      toast.error(`Failed to filter by assigned member`);
      return false;
    }
  };

  const applyFilters = async () => {
    let success = true;
    let appliedCount = 0;
    const filterMessages = [];

    if (tempFilters.priority) {
      const result = await handleFilterByPriority(tempFilters.priority);
      if (result) {
        appliedCount++;
        filterMessages.push(`Priority: ${tempFilters.priority}`);
      }
      success = success && result;
    }

    if (tempFilters.dueDate) {
      let result = true;
      if (tempFilters.dueDate === "all") {
        result = await handleFilterByDate();
        if (result) {
          appliedCount++;
          filterMessages.push("Due Date: All");
        }
      } else {
        appliedCount++;
        filterMessages.push(`Due Date: ${tempFilters.dueDate}`);
      }
      success = success && result;
    }

    if (tempFilters.assignedMember) {
      const result = await handleFilterByAssignedMember(
        tempFilters.assignedMember
      );
      if (result) {
        appliedCount++;
        const memberName =
          tempFilters.assignedMember === "me"
            ? "Me"
            : boardMembers.find((m) => m.id === tempFilters.assignedMember)
                ?.name || "Selected member";
        filterMessages.push(`Assignee: ${memberName}`);
      }
      success = success && result;
    }

    if (appliedCount === 0) {
      const result = await handleFilterByDate();
      success = success && result;
      filterMessages.push("Default filters");
    }

    if (success) {
      setActiveFilters(tempFilters);
      toast.success(`Filters applied: ${filterMessages.join(", ")}`);
    }

    setIsFilterOpen(false);
  };

  const cancelFilters = () => {
    setTempFilters(activeFilters);
    setIsFilterOpen(false);
  };

  const handleDeleteList = async (listId) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/v1/lists/${listId}`, {
        withCredentials: true,
      });
      if (res.status === 200 || res.status === 204) {
        setLists((prevLists) =>
          prevLists.filter((list) => list._id !== listId)
        );
        setColumns((prevColumns) =>
          prevColumns.filter((col) => col.id !== listId && col._id !== listId)
        );
        toast.success("List deleted successfully");
      } else {
        console.warn("[Board.jsx] Unexpected response:", res);
        toast.error("Unexpected response when deleting list");
      }
    } catch (error) {
      console.error("[Board.jsx] Error deleting list:", error);
      toast.error("Failed to delete list");
    }
  };

  const toggleFilterSubmenu = (submenu) => {
    setActiveFilterSubmenu(activeFilterSubmenu === submenu ? null : submenu);
  };

  const clearFilters = () => {
    setTempFilters(activeFilters);
  };

  const clearFilterCategory = (category) => {
    setTempFilters((prev) => ({
      ...prev,
      [category]: null,
    }));
  };

  const getFilterSummary = (category) => {
    switch (category) {
      case "assignedMember":
        if (!tempFilters.assignedMember) return "Any member";
        if (tempFilters.assignedMember === "me") return "Assigned to me";
        const member = boardMembers.find(
          (m) => m.id === tempFilters.assignedMember
        );
        return member ? member.name : "Selected member";
      case "priority":
        return tempFilters.priority
          ? tempFilters.priority.charAt(0).toUpperCase() +
              tempFilters.priority.slice(1)
          : "Any priority";
      case "dueDate":
        return tempFilters.dueDate
          ? tempFilters.dueDate === "all"
            ? "All dates"
            : tempFilters.dueDate
          : "Any date";
      default:
        return "Any";
    }
  };

  const toggleSortDirection = () => {
    setTempSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const getSortLabel = () => {
    const fieldLabels = {
      priority: "Priority",
      date: "Due Date",
    };
    return fieldLabels[appliedSort] || "Due Date";
  };

  const filterCount = Object.values(activeFilters).filter(Boolean).length;

  // Updated onListAdded to update both lists and columns states
  const onListAdded = (newList) => {
    console.log(`[Board.jsx] New list added:`, newList);
    setLists((prevLists) => {
      const updatedLists = [...prevLists, newList];
      console.log(`[Board.jsx] Updated lists after adding:`, updatedLists);
      return updatedLists;
    });
    setColumns((prevColumns) => {
      const updatedColumns = [
        ...prevColumns,
        { ...newList, cards: newList.cards || [] },
      ];
      console.log(`[Board.jsx] Updated columns after adding:`, updatedColumns);
      return updatedColumns;
    });
    toast.success("List added successfully");
  };

  // Show enhanced loading skeleton
  if (loading || loadingBoard) {
    return <BoardLoadingSkeleton />;
  }

  return (
    <div className="pb-6 min-h-screen flex flex-col item-center overflow-y-auto">
      <style>{styles}</style>
      <div className="border-2 border-[#C7C7C7] p-4 rounded-xl h-full flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            {["board", "calendar"].map((item) => (
              <button
                key={item}
                className={`text-base font-semibold pb-3 ${
                  view === item
                    ? "text-[#4D2D61] border-b-2 border-[#4D2D61]"
                    : "text-[#000000D9]"
                }`}
                onClick={() => setView(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            {view === "board" ? (
              <>
                {/* Sort Popup */}
                <div className="relative" ref={sortRef}>
                  <button
                    className="text-sm px-3 py-1.5 rounded-md text-gray-700 font-semibold border border-gray-300 bg-white shadow-sm hover:bg-gray-50 flex items-center gap-1"
                    onClick={() => {
                      setIsSortOpen(!isSortOpen);
                      setIsFilterOpen(false);
                      setTempSort(selectedSort);
                      setTempSortDirection(sortDirection);
                    }}
                  >
                    Sort by: {getSortLabel()}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                  {isSortOpen && (
                    <div className="absolute z-10 mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-56">
                      <div className="p-3 border-b border-gray-50">
                        <h3 className="font-medium">Sort by</h3>
                      </div>

                      <div className="p-1">
                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                            tempSort === "priority" ? "bg-gray-50" : ""
                          }`}
                          onClick={() => setTempSort("priority")}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4">
                              {tempSort === "priority" && (
                                <Check className="h-4 w-4 text-[#4D2D61]" />
                              )}
                            </div>
                            <span className="text-sm">Priority</span>
                          </div>
                        </div>

                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                            tempSort === "date" ? "bg-gray-50" : ""
                          }`}
                          onClick={() => setTempSort("date")}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4">
                              {tempSort === "date" && (
                                <Check className="h-4 w-4 text-[#4D2D61]" />
                              )}
                            </div>
                            <span className="text-sm">Due Date</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-50"></div>

                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={toggleSortDirection}
                      >
                        <span className="text-sm font-medium">
                          Sort direction
                        </span>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {tempSortDirection === "asc" ? (
                            <>
                              <span>Ascending</span>
                              <ArrowUp className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              <span>Descending</span>
                              <ArrowDown className="h-4 w-4" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-50">
                        <button
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          onClick={cancelSort}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-3 py-1 text-sm font-medium text-white bg-[#4D2D61] rounded-md hover:bg-opacity-90"
                          onClick={applySort}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Popup */}
                <div className="relative" ref={filterRef}>
                  <button
                    className="text-sm px-3 py-1.5 rounded-md text-gray-700 font-semibold border border-gray-300 bg-white shadow-sm hover:bg-gray-50 flex items-center gap-1"
                    onClick={() => {
                      setIsFilterOpen(!isFilterOpen);
                      setIsSortOpen(false);
                      setTempFilters(activeFilters);
                    }}
                  >
                    Filter by
                    {filterCount > 0 && (
                      <span className="ml-1 bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {filterCount}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute z-10 mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-80">
                      <div className="flex items-center justify-between p-3 border-b border-gray-50">
                        <h3 className="font-medium">Filter tasks</h3>
                        <button
                          className="text-sm text-gray-500 hover:text-gray-700"
                          onClick={clearFilters}
                        >
                          Clear all
                        </button>
                      </div>

                      {/* Assigned Member Filter */}
                      <div className="border-b border-gray-50">
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() =>
                                toggleFilterSubmenu("assignedMember")
                              }
                            >
                              <h4 className="text-sm font-medium">
                                Assigned Member
                              </h4>
                              <ChevronRight
                                className={`h-4 w-4 text-gray-400 transition-transform ${
                                  activeFilterSubmenu === "assignedMember"
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {getFilterSummary("assignedMember")}
                              </span>
                              {tempFilters.assignedMember && (
                                <button
                                  className="text-gray-400 hover:text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearFilterCategory("assignedMember");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {activeFilterSubmenu === "assignedMember" && (
                          <div className="bg-gray-50 p-3 border-t border-gray-50">
                            <div
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                tempFilters.assignedMember === "me"
                                  ? "bg-white"
                                  : ""
                              }`}
                              onClick={() =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  assignedMember: "me",
                                }))
                              }
                            >
                              <div className="w-4">
                                {tempFilters.assignedMember === "me" && (
                                  <Check className="h-4 w-4 text-[#4D2D61]" />
                                )}
                              </div>
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">Assigned to me</span>
                            </div>

                            {boardMembers.map((member) => (
                              <div
                                key={member.id}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                  tempFilters.assignedMember === member.id
                                    ? "bg-white"
                                    : ""
                                }`}
                                onClick={() =>
                                  setTempFilters((prev) => ({
                                    ...prev,
                                    assignedMember: member.id,
                                  }))
                                }
                              >
                                <div className="w-4">
                                  {tempFilters.assignedMember === member.id && (
                                    <Check className="h-4 w-4 text-[#4D2D61]" />
                                  )}
                                </div>
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                  {member.avatar ? (
                                    <img
                                      src={member.avatar || "/placeholder.svg"}
                                      alt={member.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs">
                                      {member.name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm">{member.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Priority Filter */}
                      <div className="border-b border-gray-50">
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => toggleFilterSubmenu("priority")}
                            >
                              <h4 className="text-sm font-medium">Priority</h4>
                              <ChevronRight
                                className={`h-4 w-4 text-gray-400 transition-transform ${
                                  activeFilterSubmenu === "priority"
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {getFilterSummary("priority")}
                              </span>
                              {tempFilters.priority && (
                                <button
                                  className="text-gray-400 hover:text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearFilterCategory("priority");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {activeFilterSubmenu === "priority" && (
                          <div className="bg-gray-50 p-3 border-t border-gray-50">
                            {["low", "medium", "high"].map((priority) => (
                              <div
                                key={priority}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                  tempFilters.priority === priority
                                    ? "bg-white"
                                    : ""
                                }`}
                                onClick={() =>
                                  setTempFilters((prev) => ({
                                    ...prev,
                                    priority,
                                  }))
                                }
                              >
                                <div className="w-4">
                                  {tempFilters.priority === priority && (
                                    <Check className="h-4 w-4 text-[#4D2D61]" />
                                  )}
                                </div>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    priority === "low"
                                      ? "bg-blue-500"
                                      : priority === "medium"
                                      ? "bg-yellow-500"
                                      : "bg-rose-500"
                                  }`}
                                ></span>
                                <span className="text-sm capitalize">
                                  {priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Due Date Filter */}
                      <div className="border-b border-gray-50">
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => toggleFilterSubmenu("dueDate")}
                            >
                              <h4 className="text-sm font-medium">Due Date</h4>
                              <ChevronRight
                                className={`h-4 w-4 text-gray-400 transition-transform ${
                                  activeFilterSubmenu === "dueDate"
                                    ? "rotate-90"
                                    : ""
                                }`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {getFilterSummary("dueDate")}
                              </span>
                              {tempFilters.dueDate && (
                                <button
                                  className="text-gray-400 hover:text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearFilterCategory("dueDate");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {activeFilterSubmenu === "dueDate" && (
                          <div className="bg-gray-50 p-3 border-t border-gray-50">
                            <div
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                tempFilters.dueDate === "overdue"
                                  ? "bg-white"
                                  : ""
                              }`}
                              onClick={() =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  dueDate: "overdue",
                                }))
                              }
                            >
                              <div className="w-4">
                                {tempFilters.dueDate === "overdue" && (
                                  <Check className="h-4 w-4 text-[#4D2D61]" />
                                )}
                              </div>
                              <span className="text-sm">Overdue</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                tempFilters.dueDate === "dueSoon"
                                  ? "bg-white"
                                  : ""
                              }`}
                              onClick={() =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  dueDate: "dueSoon",
                                }))
                              }
                            >
                              <div className="w-4">
                                {tempFilters.dueDate === "dueSoon" && (
                                  <Check className="h-4 w-4 text-[#4D2D61]" />
                                )}
                              </div>
                              <span className="text-sm">Due Soon</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                tempFilters.dueDate === "dueThisWeek"
                                  ? "bg-white"
                                  : ""
                              }`}
                              onClick={() =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  dueDate: "dueThisWeek",
                                }))
                              }
                            >
                              <div className="w-4">
                                {tempFilters.dueDate === "dueThisWeek" && (
                                  <Check className="h-4 w-4 text-[#4D2D61]" />
                                )}
                              </div>
                              <span className="text-sm">Due This Week</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-white ${
                                tempFilters.dueDate === "all" ? "bg-white" : ""
                              }`}
                              onClick={() =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  dueDate: "all",
                                }))
                              }
                            >
                              <div className="w-4">
                                {tempFilters.dueDate === "all" && (
                                  <Check className="h-4 w-4 text-[#4D2D61]" />
                                )}
                              </div>
                              <span className="text-sm">All Dates</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-50">
                        <button
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          onClick={cancelFilters}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-3 py-1 text-sm font-medium text-white bg-[#4D2D61] rounded-md hover:bg-opacity-90"
                          onClick={applyFilters}
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                className="bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm px-4 py-2 rounded-md font-semibold button-hover"
                onClick={() => dispatch(openMeetingModal())}
              >
                Add Meeting
              </button>
            )}
          </div>
        </div>

        {view === "board" && (
          <div className="flex-1 overflow-y-auto pb-4">
            <div
              className={`flex gap-4 min-w-0 h-full -ml-10${
                isSidebarOpen ? "pl-[300px]" : "pl-0"
              } overflow-x-auto max-w-full`}
            >
              {columns.map((col, index) => (
                <div
                  key={col.id || col._id}
                  draggable
                  onDragStart={(e) => handleListDragStart(e, col.id || col._id)}
                  onDragOver={(e) => handleListDragOver(e, index)}
                  onDrop={(e) => handleListDrop(e, col)}
                  onDragEnd={handleListDragEnd}
                  className={`animate-fade-in-up stagger-${index + 1}`}
                >
                  {draggedListId &&
                    dropIndex === index &&
                    draggedListId !== (col.id || col._id) && (
                      <div className="w-2 h-full bg-purple-300 rounded-full mx-2" />
                    )}
                  <Column
                    id={col.id || col._id}
                    title={col.name}
                    className="min-w-[300px] h-full"
                    boardId={boardId}
                    allLists={columns}
                    onDelete={() => handleDeleteList(col.id || col._id)}
                    onArchive={() => handleArchiveList(col.id || col._id)}
                    targetCardId={targetCardId}
                    cards={col.cards || []}
                  />
                </div>
              ))}

              <AddListButton boardId={boardId} onListAdded={onListAdded} />
            </div>
          </div>
        )}

        {view === "calendar" && <Calendar />}

        <AddMeetingModal boardId={boardId} />
      </div>
    </div>
  );
};

export default Board;
