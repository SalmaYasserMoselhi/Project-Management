import drag from "../assets/drag-icon.png";
import avatar3 from "../assets/Avatar3.png";
import addButton from "../assets/Add Button.png";
import List from "../assets/prime_list.png";
import File from "../assets/file_present.png";
import third from "../assets/third.png";
import { useState, useEffect } from "react";
import axios from "axios";
import CardDetails from "../Card/CardDetails";

const TaskCard = ({
  id,
  title = "Task",
  priority,
  fileCount = 0,
  commentCount = 0,
  boardId,
  allLists,
  listId,
  labels = [],
  onCardUpdate,
}) => {
  const [isCardDetailsOpen, setIsCardDetailsOpen] = useState(false);
  const [actualFileCount, setActualFileCount] = useState(fileCount);
  // Maximum number of labels to display before showing "+N"
  const MAX_VISIBLE_LABELS = 2;

  // Fetch file count if needed
  useEffect(() => {
    // Only fetch if we have a card ID
    if (id) {
      const fetchAttachments = async () => {
        try {
          const response = await axios.get(`/api/v1/cards/${id}`);
          if (
            response.data &&
            response.data.data &&
            response.data.data.attachments
          ) {
            setActualFileCount(response.data.data.attachments.length);
          }
        } catch (err) {
          console.error("Error fetching attachments:", err);
        }
      };

      fetchAttachments();
    } else {
      setActualFileCount(fileCount);
    }
  }, [id, fileCount]);

  // Update priority styles to match CardPriority component
  const priorityColors = {
    high: { color: "#DC2626", bg: "#FFECEC" }, // Red
    medium: { color: "#F59E0B", bg: "#FFF6E6" }, // Yellow
    low: { color: "#16A34A", bg: "#E7F7EC" }, // Green
    none: { color: "#9CA3AF", bg: "#F3F4F6" }, // Gray
  };

  // Normalize priority to lowercase and default to "medium" if invalid
  const normalizedPriority = (priority || "").toLowerCase();
  const priorityStyle =
    priorityColors[normalizedPriority] || priorityColors.medium;

  const handleCardClick = (e) => {
    // Prevent opening card details when clicking on the options icon
    if (e.target.alt === "Options") {
      return;
    }
    setIsCardDetailsOpen(true);
  };

  // فقط إغلاق البطاقة دون تحديث القائمة
  const handleCardClose = () => {
    setIsCardDetailsOpen(false);
  };

  // تحديث القائمة فقط عند حفظ البطاقة
  const handleCardSaved = (originalListId, newListId) => {
    if (onCardUpdate) {
      // If we have both original and new list IDs, it means the card was moved
      if (originalListId && newListId && originalListId !== newListId) {
        onCardUpdate(originalListId, newListId);
      } else {
        onCardUpdate();
      }
    }
  };

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
            <h4 className="font-semibold mt-1 mb-3">{title}</h4>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 18 24"
            >
              <path
                fill="none"
                stroke="#4D2D61"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
              />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-2 py-1 text-xs font-medium rounded-lg"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.color,
              }}
            >
              {normalizedPriority.charAt(0).toUpperCase() +
                normalizedPriority.slice(1)}
            </span>

            {/* Display limited number of labels with +N indicator */}
            {labels && labels.length > 0 && (
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

                {/* Show +N indicator if there are more labels than the limit */}
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
              <img
                src={List}
                className="w-6 h-6 cursor-pointer hover:opacity-70"
                alt="Checklist"
              />
              <div className="flex items-center gap-0">
                <img
                  src={File}
                  className="w-5 h-5 cursor-pointer hover:opacity-70"
                  alt="Files"
                />
                <span className="text-sm text-gray-600 font-bold mt-1">
                  {actualFileCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <img
                  src={third}
                  className="w-5 h-5 cursor-pointer hover:opacity-70 mt-1"
                  alt="Comments"
                />
                <span className="text-sm text-gray-600 font-bold mt-1">
                  {commentCount}
                </span>
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
