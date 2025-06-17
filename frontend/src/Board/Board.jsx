"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Column from "./Column";
import AddListButton from "./AddListButton";
import drop from "../assets/drop.png";
import Calendar from "./Calendar";
import AddMeetingModal from "./AddMeetingModal";
import { useSelector, useDispatch } from "react-redux";
import { openMeetingModal } from "../features/Slice/ComponentSlice/meetingModalSlice";
import {
  Check,
  ChevronDown,
  ChevronRight,
  X,
  ArrowUp,
  ArrowDown,
  User,
} from "lucide-react";

const Board = ({ workspaceId, boardId, restoredLists }) => {
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const dispatch = useDispatch();
  const BASE_URL = "http://localhost:3000";
  const [lists, setLists] = useState([]);
  const [view, setView] = useState("board");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Mock board members data - in a real app, this would come from your API
  const boardMembers = [
    {
      id: "1",
      name: "John Doe",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: "2",
      name: "Jane Smith",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: "3",
      name: "Alex Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  ];

  const sortRef = useRef(null);
  const filterRef = useRef(null);

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
        // Reset temp states when closing without applying
        setTempSort(selectedSort);
        setTempSortDirection(sortDirection);
        setTempFilters(activeFilters);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSort, sortDirection, activeFilters]);

  useEffect(() => {
    if (restoredLists && restoredLists.length > 0) {
      setColumns((prev) => [...prev, ...restoredLists]);
    }
  }, [restoredLists]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/v1/lists/board/${boardId}/lists`
        );
        console.log("[Board.jsx] Fetched lists:", res.data.data.lists);
        setColumns(res.data.data.lists);
      } catch (error) {
        console.error("[Board.jsx] Error fetching lists:", error);
        toast.error("Failed to load board lists");
      } finally {
        setLoading(false);
      }
    };

    if (boardId) fetchLists();
  }, [boardId]);

  // Initialize temp states
  useEffect(() => {
    setTempSort(selectedSort);
    setTempSortDirection(sortDirection);
    setTempFilters(activeFilters);
  }, []);

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

  // This is a placeholder function - in a real app, you would implement the API call
  const handleFilterByAssignedMember = async (memberId) => {
    try {
      // In a real app, you would call your API to filter by assigned member
      // For now, we'll just simulate success
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

    // Apply priority filter if set
    if (tempFilters.priority) {
      const result = await handleFilterByPriority(tempFilters.priority);
      if (result) {
        appliedCount++;
        filterMessages.push(`Priority: ${tempFilters.priority}`);
      }
      success = success && result;
    }

    // Apply due date filter if set
    if (tempFilters.dueDate) {
      let result = true;
      if (tempFilters.dueDate === "all") {
        result = await handleFilterByDate();
        if (result) {
          appliedCount++;
          filterMessages.push("Due Date: All");
        }
      } else {
        // In a real app, you would implement specific due date filters
        appliedCount++;
        filterMessages.push(`Due Date: ${tempFilters.dueDate}`);
      }
      success = success && result;
    }

    // Apply assigned member filter if set
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

    // If no filters are set, apply default date filter
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

  if (loading) return <div className="p-4">Loading board...</div>;

  return (
    <div className="p-6 min-h-screen mt-2 flex flex-col item-center overflow-y-auto -ml-4">
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
                    className="text-sm px-3 py-1.5 rounded-md text-gray-700 font-semibold border border-gray-300 bg-white shadow hover:bg-gray-50 flex items-center gap-1"
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
                    className="text-sm px-3 py-1.5 rounded-md text-gray-700 font-semibold border border-gray-300 bg-white shadow hover:bg-gray-50 flex items-center gap-1"
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
                className="bg-[#4D2D61] text-white text-sm px-4 py-2 rounded-md font-semibold"
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
              className={`flex gap-0 min-w-0 h-full -ml-10${
                isSidebarOpen ? "pl-[300px]" : "pl-0"
              } overflow-x-auto max-w-full`}
            >
              {columns.map((col) => (
                <Column
                  key={col.id || col._id}
                  id={col.id || col._id}
                  title={col.name}
                  className="min-w-[300px] h-full"
                  boardId={boardId}
                  allLists={columns}
                  onDelete={handleDeleteList}
                />
              ))}

              <AddListButton
                boardId={boardId}
                onListAdded={(newList) => {
                  setLists((prev) => [...prev, newList]);
                }}
              />
            </div>
          </div>
        )}

        {view == "calendar" && <Calendar />}

        {/* Add Meeting Modal - No longer passing props, using Redux instead */}
        <AddMeetingModal boardId={boardId} />
      </div>
    </div>
  );
};

export default Board;
