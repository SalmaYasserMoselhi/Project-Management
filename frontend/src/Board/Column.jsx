
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import vector from "../assets/Vector.png";
import TaskCard from "./TaskCard";
import icon from "../assets/icon.png";
import CardDetails from "../Card/CardDetails";

const Column = ({
  id,
  title,
  className,
  onDelete,
  onArchive,
  boardId,
  allLists,
}) => {
  const BASE_URL = "http://localhost:3000";
  const [cards, setCards] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const vectorRef = useRef(null);

  const fetchCards = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/v1/cards/list/${id}/cards`);
      const cards = res.data.data.cards || [];
      setCards(cards);
    } catch (err) {
      console.error("Error loading cards:", err);
    }
  };

  useEffect(() => {
    if (id) fetchCards();
  }, [id]);

  // Refresh list on card move events
  useEffect(() => {
    const handleRefreshList = (event) => {
      if (event.detail && event.detail.listId === id) {
        fetchCards();
      }
    };

    window.addEventListener("refreshList", handleRefreshList);
    return () => {
      window.removeEventListener("refreshList", handleRefreshList);
    };
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        vectorRef.current &&
        !vectorRef.current.contains(event.target)
      ) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddCard = async () => {
    if (!newTitle.trim()) return;

    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/api/v1/cards`, {
        title: newTitle,
        listId: id,
        priority,
      });

      await fetchCards();
      setNewTitle("");
      setPriority("Medium");
      setIsAdding(false);
    } catch (err) {
      console.error("Error creating card:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);

      const res = await axios.patch(
        `${BASE_URL}/api/v1/lists/${id}/archive`,
        {},
        {
          withCredentials: true,
        }
      );

      if (res.status === 200) {
        console.log("List archived successfully");
        if (onArchive) onArchive(id); // Notify parent to update state
        setDropdownVisible(false);
      }
    } catch (err) {
      console.error("Error archiving list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this list?"
    );
    if (!confirmDelete) return;

    setDropdownVisible(false);
    if (onDelete) onDelete(id);
  };

  const handleCardUpdate = async (originalListId, newListId) => {
    await fetchCards();

    if (
      originalListId &&
      newListId &&
      (originalListId === id || newListId === id)
    ) {
      const otherListId = originalListId === id ? newListId : originalListId;

      const event = new CustomEvent("refreshList", {
        detail: { listId: otherListId },
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div
      className={`p-2 rounded-lg mb-4 md:mb-0 md:mr-4 ${className} min-w-[300px]`}
    >
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
        <div className="flex items-center w-[190px]">
          <h3 className="text-black font-semibold me-2">
            {title}
            <span
              className="px-2 py-1 rounded-full text-sm ms-2"
              style={{ backgroundColor: "#A855F71A" }}
            >
              {cards.length}
            </span>
          </h3>
        </div>
        <div className="flex items-center relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 18 24"
            onClick={() => setDropdownVisible(!dropdownVisible)}
            ref={vectorRef}
            className="cursor-pointer"
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
          {dropdownVisible && (
            <div
              className="absolute right-0 top-full w-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10"
              ref={dropdownRef}
            >
              <button
                onClick={handleArchive}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
              >
                Archive
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        {cards.map((card) => (
          <TaskCard
            key={card.id}
            id={card.id || card._id}
            title={card.title}
            priority={card.priority || "Medium"}
            fileCount={card.attachments?.length || 0}
            commentCount={card.commentCount || 0}
            listId={id}
            boardId={boardId}
            allLists={allLists}
            labels={card.labels || []}
            onCardUpdate={handleCardUpdate}
          />
        ))}

        {isAdding && (
          <CardDetails
            onClose={() => setIsAdding(false)}
            currentListId={id}
            boardId={boardId}
            allLists={allLists}
            onCardSaved={handleCardUpdate}
          />
        )}
      </div>

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="bg-white mt-3 py-3 w-full rounded-md border border-[#F2F4F7] shadow-sm transition-all hover:shadow-md"
        >
          <img
            src={icon}
            className="w-5 h-5 block mx-auto hover:brightness-80"
            alt="Add task"
          />
        </button>
      )}
    </div>
  );
};

export default Column;
