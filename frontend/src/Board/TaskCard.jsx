
import drag from "../assets/drag-icon.png";
import vector from "../assets/Vector.png";
import avatar3 from "../assets/Avatar3.png";
import addButton from "../assets/Add Button.png";
import List from "../assets/prime_list.png";
import File from "../assets/file_present.png";
import third from "../assets/third.png";
import { useState, useRef, useEffect } from "react";
import CardDetails from "../Card/CardDetails";
import toast from "react-hot-toast";

const TaskCard = ({
  id,
  title = "Task",
  priority,
  fileCount = 3,
  commentCount = 5,
  boardId,
  allLists,
  listId,
  labels = [],
  onCardUpdate,
}) => {
  const [isCardDetailsOpen, setIsCardDetailsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const BASE_URL = "http://localhost:3000"; // Adjust as needed

  const MAX_VISIBLE_LABELS = 2;

  const priorityColors = {
    high: { color: "#DC2626", bg: "#FFECEC" },
    medium: { color: "#F59E0B", bg: "#FFF6E6" },
    low: { color: "#16A34A", bg: "#E7F7EC" },
    none: { color: "#9CA3AF", bg: "#F3F4F6" },
  };

  const normalizedPriority = (priority || "medium").toLowerCase();
  const priorityStyle = priorityColors[normalizedPriority] || priorityColors.medium;

  // Open card details modal except when clicking dropdown
  const handleCardClick = (e) => {
    if (e.target.closest(".dropdown-button")) return;
    setIsCardDetailsOpen(true);
  };

  const handleCardClose = () => setIsCardDetailsOpen(false);

  const handleCardSaved = (originalListId, newListId) => {
    if (onCardUpdate) {
      if (originalListId && newListId && originalListId !== newListId) {
        onCardUpdate(originalListId, newListId);
      } else {
        onCardUpdate();
      }
    }
  };

  const handleArchiveCard = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/cards/${id}/archive`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (response.ok && result.status === "success") {
        toast.success("Card archived successfully");
        setIsDropdownOpen(false);
        onCardUpdate?.();
      } else {
        toast.error(result.message || "Failed to archive card");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error archiving card");
    }
  };

 const handleDeleteCard = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/cards/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (response.ok) {
      toast.success("Card deleted successfully");
      setIsDropdownOpen(false);
      onCardUpdate?.(); // trigger refetch
    } else {
      const result = await response.json().catch(() => ({}));
      toast.error(result.message || "Failed to delete card");
    }
  } catch (error) {
    console.error(error);
    toast.error("Error deleting card");
  }
};


  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div
        className="flex rounded-lg overflow-hidden shadow-lg mb-3 w-full cursor-pointer"
        onClick={handleCardClick}
      >
        <div
          className="w-8 bg-[#4D2D61] flex items-center justify-center"
          style={{ minHeight: "100px" }}
        >
          <img src={drag} className="w-5 h-8 text-white" alt="Drag" />
        </div>

        <div className="bg-white text-black p-3 rounded-r-lg flex-grow w-full">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold mt-1 mb-3 truncate">{title}</h4>

            <div className="relative dropdown-button" ref={dropdownRef}>
              <svg
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="cursor-pointer"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 18 24"
              >
                <path
                  fill="none"
                  stroke="#4D2D61"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
                />
              </svg>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded-lg shadow-md z-10">
                  <button
                    onClick={handleArchiveCard}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-800"
                  >
                    Archive
                  </button>
                  <button
                    onClick={handleDeleteCard}
                    className="w-full text-left px-4 py-2 hover:bg-red-100 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-2 py-1 text-xs font-medium rounded-lg"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.color,
              }}
            >
              {normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1)}
            </span>

            {labels.length > 0 && (
              <>
                {labels.slice(0, MAX_VISIBLE_LABELS).map((label, index) => (
                  <span
                    key={label.id || index}
                    className="px-2 py-1 text-xs font-medium rounded-lg"
                    style={{
                      backgroundColor: `${label.color}33`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}

                {labels.length > MAX_VISIBLE_LABELS && (
                  <span className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
                    +{labels.length - MAX_VISIBLE_LABELS}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex -space-x-2">
              <img
                src={avatar3}
                className="w-8 h-8 rounded-full border-2 border-white"
                alt="avatar"
              />
              <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-bold text-[#606C80]">
                +5
              </span>
              <img
                src={addButton}
                alt="Add"
                className="w-8 h-8 ms-4 rounded-full border-2 border-white bg-gray-300 cursor-pointer"
              />
            </div>

            <div className="flex gap-2 ml-4 items-center">
              <img src={List} className="w-6 h-6 cursor-pointer hover:opacity-70" alt="Checklist" />
              <div className="flex items-center gap-0">
                <img src={File} className="w-5 h-5 cursor-pointer hover:opacity-70" alt="Files" />
                <span className="text-sm text-gray-600 font-bold mt-1">{fileCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <img src={third} className="w-5 h-5 cursor-pointer hover:opacity-70 mt-1" alt="Comments" />
                <span className="text-sm text-gray-600 font-bold mt-1">{commentCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCardDetailsOpen && (
        <CardDetails
          cardId={id}
          currentListId={listId}
          boardId={boardId}
          allLists={allLists}
          onClose={handleCardClose}
          onCardSaved={handleCardSaved}
        />
      )}
    </>
  );
};

export default TaskCard;
