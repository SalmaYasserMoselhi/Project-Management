

import { useState } from "react";
import Column from "./Column";

const Board = () => {
  const [view, setView] = useState("board");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const columns = [
    { title: "To Do Tasks", count: 3 },
    { title: "In Process", count: 2 },
    { title: "In Review", count: 2 },
    { title: "Done", count: 5 },
  ];

  return (
    <div className="p-1 min-h-screen font-[Nunito] mt-7 flex flex-col items-center -ml-4">
      {/* Board Wrapper with Border (Left, Top, Bottom) */}
      <div className="border-l-2 border-t-2 border-b-2 border-[#C7C7C7] p-4 rounded-xl w-full max-w-6xl">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-6">
            {["board", "timeline", "calendar"].map((item) => (
              <button
                key={item}
                className={`text-base font-semibold pb-3 ${
                  view === item ? "text-[#4D2D61] border-b-2 border-[#4D2D61]" : "text-[#000000D9]"
                }`}
                onClick={() => setView(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            {/* Sort By Button with Dropdown */}
            <div className="relative">
              <button
                className="text-sm px-2 py-1 rounded-md text-[#000000D9] font-semibold  border-2 border-[#C7C7C7] flex items-center gap-1"
                onClick={() => setIsSortOpen(!isSortOpen)}
              >
                Sort by{" "}
                <img src="src\assets\drop.png" alt="Dropdown" className="w-4 h-4" />
              </button>
              {isSortOpen && (
                <div className="absolute top-8 left-0 bg-white border border-[#C7C7C7] shadow-md rounded-md p-2 w-32">
                  <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">Date</button>
                  <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">Priority</button>
                </div>
              )}
            </div>

            {/* Filter By Button with Border and Dropdown */}
            <div className="relative">
              <button
                className="text-sm px-2 py-1 rounded-md text-[#000000D9] font-semibold border-2 border-[#C7C7C7] flex items-center gap-1"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                Filter by{" "}
                <img src="src\assets\drop.png" alt="Dropdown" className="w-4 h-4" />
              </button>
              {isFilterOpen && (
                <div className="absolute top-8 left-0 bg-white border border-[#C7C7C7] shadow-md rounded-md p-2 w-32">
                  <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">Date</button>
                  <button className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">Priority</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Board View */}
        {view === "board" && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-1 min-w-[min-content]">
              {columns.map((col, index) => (
                <Column key={index} title={col.title.replace("List", "").trim()} count={col.count} className="min-w-[300px]" />
              ))}
            </div>
          </div>
        )}

        {/* Placeholder Views for Timeline and Calendar */}
        {view !== "board" && (
          <div className="text-[#000000D9] text-center py-10 font-semibold text-xl">
            {`${view.charAt(0).toUpperCase() + view.slice(1)} View Coming Soon...`}
          </div>
        )}
      </div>
    </div>
  );
};

export default Board;
