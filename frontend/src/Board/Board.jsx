

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Column from "./Column";
import AddListButton from "./AddListButton";
import drop from "../assets/drop.png";
import Calendar from "./Calendar";
import { useSelector } from "react-redux";

const Board = ({ workspaceId, boardId, restoredLists }) => {
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const BASE_URL = "http://localhost:3000";
  const [lists, setLists] = useState([]);
  const [view, setView] = useState("board");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSort, setSelectedSort] = useState("date");
  const [selectedFilter, setSelectedFilter] = useState("date");
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sortRef.current && !sortRef.current.contains(event.target) &&
        filterRef.current && !filterRef.current.contains(event.target)
      ) {
        setIsSortOpen(false);
        setIsFilterOpen(false);
        setIsPriorityFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (restoredLists && restoredLists.length > 0) {
      setColumns((prev) => [...prev, ...restoredLists]);
    }
  }, [restoredLists]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/v1/lists/board/${boardId}/lists`);
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

  const updateColumnsWithCards = (cardsByList, sortBy = "position") => {
    console.log("[Board.jsx] Received cardsByList:", cardsByList);
    console.log("[Board.jsx] Current columns:", columns);
    const updatedColumns = columns.map((col) => {
      const listData = cardsByList.find((list) => list.listId === col.id || list.listId === col._id);
      console.log(`[Board.jsx] Mapping listId ${col.id || col._id}:`, listData);
      return { ...col, cards: listData ? listData.cards : col.cards || [] };
    });
    console.log("[Board.jsx] Updated columns:", updatedColumns);
    setColumns(updatedColumns);

    updatedColumns.forEach((col) => {
      console.log(`[Board.jsx] Dispatching refreshList for listId: ${col.id || col._id}, sortBy: ${sortBy}, cards:`, col.cards);
      const event = new CustomEvent("refreshList", {
        detail: { listId: col.id || col._id, sortBy, cards: col.cards || [] },
      });
      window.dispatchEvent(event);
    });
  };

  const fetchSortedByPriority = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/v1/cards/board/${boardId}/priority-sorted`);
      console.log("[Board.jsx] Priority sorted response:", res.data);
      let cardsByList = res.data.data.cardsByList || [];
      if (!cardsByList.length) {
        console.warn("[Board.jsx] No cards returned for priority sort, keeping existing cards");
        cardsByList = columns.map((col) => ({
          listId: col.id || col._id,
          listName: col.name,
          cards: col.cards || [],
        }));
      }
      updateColumnsWithCards(cardsByList, "priority");
      setSelectedSort("priority");
      toast.success("Sorted by Priority");
    } catch (error) {
      console.error("[Board.jsx] Error fetching sorted cards by priority:", error);
      toast.error("Failed to sort cards by priority");
    } finally {
      setIsSortOpen(false);
    }
  };

  const fetchSortedByDate = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/v1/lists/board/${boardId}/lists`);
      console.log("[Board.jsx] Default sorted response (by date/position):", res.data);
      const cardsByList = res.data.data.lists.map((list) => ({
        listId: list._id,
        listName: list.name,
        cards: list.cards || [],
      }));
      updateColumnsWithCards(cardsByList, "position");
      setSelectedSort("date");
      toast.success("Sorted by Date");
    } catch (error) {
      console.error("[Board.jsx] Error fetching sorted cards by date:", error);
      toast.error("Failed to sort by date");
    } finally {
      setIsSortOpen(false);
    }
  };

  const handleFilterByPriority = async (priority) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/v1/cards/board/${boardId}/priority/${priority}`);
      console.log(`[Board.jsx] Filter by ${priority} response:`, res.data);
      let cardsByList = [];
      if (res.data.data.cards && res.data.data.cards.length) {
        cardsByList = columns.map((col) => {
          const filteredCards = res.data.data.cards.filter(
            (card) => (card.list === col.id || card.list === col._id)
          );
          console.log(`[Board.jsx] Filtered cards for list ${col.id || col._id} (${col.name}):`, filteredCards);
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
      console.log("[Board.jsx] Transformed cardsByList for filter:", cardsByList);
      updateColumnsWithCards(cardsByList, "priority");
      setSelectedFilter(`priority-${priority}`);
      toast.success(`Filtered by ${priority} priority`);
    } catch (error) {
      console.error(`[Board.jsx] Error filtering cards by ${priority} priority:`, error);
      toast.error(`Failed to filter by ${priority} priority`);
    } finally {
      setIsFilterOpen(false);
      setIsPriorityFilterOpen(false);
    }
  };

  const handleFilterByDate = async () => {
    console.log("[Board.jsx] Filtering by date not implemented yet. Please provide date filtering API.");
    setSelectedFilter("date");
    setIsFilterOpen(false);
  };

  const handleDeleteList = async (listId) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/v1/lists/${listId}`, {
        withCredentials: true,
      });
      if (res.status === 200 || res.status === 204) {
        setLists((prevLists) => prevLists.filter((list) => list._id !== listId));
        setColumns((prevColumns) => prevColumns.filter((col) => col.id !== listId && col._id !== listId));
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
                <div className="relative" ref={sortRef}>
                  <button
                    className="text-sm px-3 py-1.5 rounded-md text-gray-700 font-semibold border border-gray-300 bg-white shadow hover:bg-gray-50 flex items-center gap-1"
                    onClick={() => setIsSortOpen(!isSortOpen)}
                  >
                    Sort by: {selectedSort === "date" ? "Date" : "Priority"}
                    <img src={drop} alt="Dropdown" className="w-4 h-4" />
                  </button>
                  {isSortOpen && (
                    <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-36">
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedSort === "date" ? "bg-gray-100" : ""
                        }`}
                        onClick={fetchSortedByDate}
                      >
                        Date
                      </button>
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedSort === "priority" ? "bg-gray-100" : ""
                        }`}
                        onClick={fetchSortedByPriority}
                      >
                        Priority
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative" ref={filterRef}>
                  <button
                    className="text-sm px-3 py-1.5 rounded-md text-gray-700 font-semibold border border-gray-300 bg-white shadow hover:bg-gray-50 flex items-center gap-1"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    Filter by: {selectedFilter === "date" ? "Date" : `Priority (${selectedFilter.split('-')[1]})`}
                    <img src={drop} alt="Dropdown" className="w-4 h-4" />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-36">
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedFilter === "date" ? "bg-gray-100" : ""
                        }`}
                        onClick={handleFilterByDate}
                      >
                        Date
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setIsPriorityFilterOpen(!isPriorityFilterOpen)}
                      >
                        Priority
                      </button>
                      {isPriorityFilterOpen && (
                        <div className="pl-4">
                          <button
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                              selectedFilter === "priority-low" ? "bg-gray-100" : ""
                            }`}
                            onClick={() => handleFilterByPriority("low")}
                          >
                            Low Priority
                          </button>
                          <button
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                              selectedFilter === "priority-medium" ? "bg-gray-100" : ""
                            }`}
                            onClick={() => handleFilterByPriority("medium")}
                          >
                            Medium Priority
                          </button>
                          <button
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                              selectedFilter === "priority-high" ? "bg-gray-100" : ""
                            }`}
                            onClick={() => handleFilterByPriority("high")}
                          >
                            High Priority
                          </button>
                        </div>
                      )}
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={async () => {
                          try {
                            const res = await axios.get(`${BASE_URL}/api/v1/lists/board/${boardId}/lists`);
                            console.log("[Board.jsx] Clear filter fetched lists:", res.data.data.lists);
                            setColumns(res.data.data.lists);
                            setSelectedFilter("date");
                            toast.success("Filters cleared");
                          } catch (error) {
                            console.error("[Board.jsx] Error clearing filters:", error);
                            toast.error("Failed to clear filters");
                          } finally {
                            setIsFilterOpen(false);
                          }
                        }}
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button className="bg-[#4D2D61] text-white text-sm px-4 py-2 rounded-md font-semibold">
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

        {view === "calendar" && <Calendar />}
      </div>
    </div>
  );
};

export default Board;




