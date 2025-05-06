import { useState, useEffect } from "react";
import axios from "axios";
import Column from "./Column";
import AddListButton from "./AddListButton";
import drop from "../assets/drop.png";
import Calendar from "./Calendar";
import { useSelector } from "react-redux";
const Board = ({ workspaceId, boardId }) => {
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const BASE_URL = "http://localhost:3000";
  const [lists, setLists] = useState([]);
  const [view, setView] = useState("board");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await axios.get(`/api/v1/lists/board/${boardId}/lists`);
        console.log("cols :", res.data.data);
        setColumns(res.data.data.lists); // assuming `data` is an array of lists
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

  if (loading) return <div className="p-4">Loading board...</div>;

  const handleDeleteList = async (listId) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/v1/lists/${listId}`, {
        withCredentials: true,
      });

      if (res.status === 200 || res.status === 204) {
        console.log("List deleted successfully");
        window.location.reload();
        setLists((prevLists) =>
          prevLists.filter((list) => list._id !== listId)
        );
      } else {
        console.warn("Unexpected response:", res);
      }
    } catch (error) {
      console.error("Error deleting list:", error);
      alert("Failed to delete list.");
    }
  };

  return (
    <div className="p-6 min-h-screen mt-2 flex flex-col item-center overflow-y-auto -ml-4 ">
      <div className="border-2 border-[#C7C7C7] p-4 rounded-xl h-full flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 ">
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
                <div className="relative">
                  <button
                    className="text-sm px-2 py-1 rounded-md text-[#000000D9] font-semibold border-2 border-[#C7C7C7] flex items-center gap-1"
                    onClick={() => setIsSortOpen(!isSortOpen)}
                  >
                    Sort by
                    <img src={drop} alt="Dropdown" className="w-4 h-4" />
                  </button>
                  {isSortOpen && (
                    <div className="absolute top-8 left-0 bg-white border border-[#C7C7C7] shadow-md rounded-md p-2 w-32">
                      <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">
                        Date
                      </button>
                      <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">
                        Priority
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    className="text-sm px-2 py-1 rounded-md text-[#000000D9] font-semibold border-2 border-[#C7C7C7] flex items-center gap-1"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    Filter by
                    <img src={drop} alt="Dropdown" className="w-4 h-4" />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute top-8 left-0 bg-white border border-[#C7C7C7] shadow-md rounded-md p-2 w-32">
                      <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">
                        Date
                      </button>
                      <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">
                        Priority
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

        {/* Board View */}
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

              {/* <AddListButton addNewList={addNewList} /> */}
              <AddListButton
                boardId={boardId}
                onListAdded={(newList) => {
                  // refresh your lists here
                  setLists((prev) => [...prev, newList]);
                }}
              />
            </div>
          </div>
        )}

        {view == "calendar" && <Calendar />}
      </div>
    </div>
  );
};

export default Board;
