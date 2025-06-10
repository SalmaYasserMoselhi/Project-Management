
import { useState, useEffect, useRef } from "react";
import axios from "axios";
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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleListRestored = (restoredList) => {
    setColumns((prevColumns) => [...prevColumns, restoredList]);
  };

  useEffect(() => {
    if (restoredLists && restoredLists.length > 0) {
      setColumns((prev) => [...prev, ...restoredLists]);
    }
  }, [restoredLists]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await axios.get(`/api/v1/lists/board/${boardId}/lists`);
        setColumns(res.data.data.lists);
      } catch (error) {
        console.error("Error fetching lists:", error);
      } finally {
        setLoading(false);
      }
    };

    if (boardId) fetchLists();
  }, [boardId]);

  const addNewList = () => {
    const newList = {
      id: `new-${Date.now()}`,
      name: `New List ${columns.length + 1}`,
    };
    setColumns([...columns, newList]);
  };

  const updateColumnsWithCards = (cardsByList) => {
    const updatedColumns = columns.map((col) => {
      const listData = cardsByList.find((list) => list.listId === col.id);
      return listData ? { ...col, cards: listData.cards } : col;
    });
    setColumns(updatedColumns);
  };

  const fetchSortedByPriority = async () => {
    try {
      const res = await axios.get(`/api/v1/cards/board/${boardId}/priority-sorted`);
      updateColumnsWithCards(res.data.data.cardsByList);
    } catch (error) {
      console.error("Error fetching sorted cards:", error);
    } finally {
      setIsSortOpen(false);
    }
  };

  const handleFilterByPriority = async (priority) => {
    try {
      const res = await axios.get(`/api/v1/cards/board/${boardId}/priority/${priority}`);
      updateColumnsWithCards(res.data.data.cardsByList);
    } catch (error) {
      console.error("Error filtering cards by priority:", error);
    } finally {
      setIsFilterOpen(false);
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/v1/lists/${listId}`, {
        withCredentials: true,
      });

      if (res.status === 200 || res.status === 204) {
        setLists((prevLists) => prevLists.filter((list) => list._id !== listId));
        setColumns((prevColumns) => prevColumns.filter((col) => col.id !== listId));
      } else {
        console.warn("Unexpected response:", res);
      }
    } catch (error) {
      console.error("Error deleting list:", error);
      alert("Failed to delete list.");
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
                    Sort by
                    <img src={drop} alt="Dropdown" className="w-4 h-4" />
                  </button>
                  {isSortOpen && (
                    <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-36">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
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
                    Filter by
                    <img src={drop} alt="Dropdown" className="w-4 h-4" />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-36">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleFilterByPriority("low")}
                      >
                        Low Priority
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleFilterByPriority("medium")}
                      >
                        Medium Priority
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleFilterByPriority("high")}
                      >
                        High Priority
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
                  key={col.id}
                  id={col.id}
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




