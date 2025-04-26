
import AddBoardPopup from "./AddBoardPopup";
import { useDispatch, useSelector } from "react-redux";
import { toggleWorkspaceOpen } from "../features/Slice/ComponentSlice/sidebarSlice";
import { useState } from "react";
import { MoreVertical, Pin } from "lucide-react";

const WorkspacePopup = () => {
  const dispatch = useDispatch();
  const { isWorkspaceOpen, isSidebarOpen } = useSelector((state) => state.sidebar);
  const [activeTab, setActiveTab] = useState("Active");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddBoardOpen, setIsAddBoardOpen] = useState(false);

  const activeBoards = ["Board 1", "Board 4", "Board 6"];
  const allBoards = ["Board 1", "Board 2", "Board 3", "Board 4", "Board 5"];

  return (
    <>
      {/* Backdrop Overlay */}
      {isWorkspaceOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => dispatch(toggleWorkspaceOpen())}
        />
      )}

      {/* Workspace Panel */}
      <div
        className={`fixed z-50 left-60 top-0 h-screen bg-white shadow-xl border-l border-[#6A3B82] transition-all duration-300 font-[Nunito] ${
          isWorkspaceOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "293px",
          left: isSidebarOpen ? "240px" : "80px",
        }}
      >
        <div className="w-[293px] p-4 bg-white rounded-2xl shadow-md flex flex-col h-screen">
          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Board name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#4D2D61]"
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
          <div className="flex mb-3 bg-gray-100 p-1 rounded-xl">
            {["Active", "Archived"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1 rounded-xl text-md font-semibold ${
                  activeTab === tab ? "bg-[#4D2D61] text-white shadow" : "text-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Active Boards */}
          {activeTab === "Active" && (
            <div className="flex flex-col gap-4 mb-3">
              {activeBoards.map((board, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-1 rounded-lg hover:shadow-md hover:scale-[1.02] transition"
                >
                  <span className="text-[#4D2D61] font-medium">{board}</span>
                  <div className="flex gap-2 items-center">
                    <Pin className="w-5 h-5 text-[#4D2D61]" />
                    <MoreVertical className="w-5 h-5 text-[#4D2D61]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <hr className="border-gray-300 mb-4" />

          {/* All Boards header - only show if Active tab */}
          {activeTab === "Active" && (
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-[#4D2D61]">
                All Boards <span className="font-normal">{allBoards.length}</span>
              </h2>
              <button className="text-gray-500 text-sm flex items-center gap-1">
                Sort
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* All Boards list */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {allBoards.map((board, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 rounded-lg hover:shadow-md hover:scale-[1.02] transition"
              >
                <span className="text-[#4D2D61] font-medium">{board}</span>
                <div className="flex gap-2 items-center">
                  <Pin className="w-5 h-5 text-[#4D2D61]" />
                  <MoreVertical className="w-5 h-5 text-[#4D2D61]" />
                </div>
              </div>
            ))}
          </div>

          {/* Add Board Button */}
          <div className="mt-auto">
            <button
              onClick={() => setIsAddBoardOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#4D2D61] hover:brightness-90 text-white font-semibold transition"
            >
              <img
                src="src/assets/addd.png"
                 loading="lazy"
                className="w-5 h-5 block"
                alt="Add task"
              />
              Add Board
            </button>
          </div>
        </div>
      </div>

      {/* Add Board Popup */}
      {isAddBoardOpen && <AddBoardPopup onClose={() => setIsAddBoardOpen(false)} />}
    </>
  );
};

export default WorkspacePopup;


