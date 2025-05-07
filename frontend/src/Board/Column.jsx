import { useEffect, useState, useRef } from "react";
import axios from "axios";
import vector from "../assets/Vector.png";
import TaskCard from "./TaskCard";
import icon from "../assets/icon.png";
import CardDetails from "../Card/CardDetails";

const Column = ({ id, title, className, onDelete, boardId, allLists }) => {
  // onDelete prop to update parent state
  const BASE_URL = "http://localhost:3000";
  const [cards, setCards] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const vectorRef = useRef(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/v1/cards/list/${id}/cards?include=attachments,comments`
        );

        setCards(res.data.data.cards || []);
      } catch (err) {
        console.error("Error loading cards:", err);
      }
    };

    if (id) fetchCards();
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
      const res = await axios.post(`${BASE_URL}/api/v1/cards`, {
        title: newTitle,
        listId: id,
        priority,
      });

      // Append new card to local list
      setCards([...cards, res.data.data]);
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
        window.location.reload();
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
    onDelete(id);
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
          <img
            src={vector}
            alt="Options"
            className="w-[18px] h-[4px] cursor-pointer"
            onClick={() => setDropdownVisible(!dropdownVisible)} // Toggle dropdown visibility
            ref={vectorRef} // Reference to vector icon
          />
          {dropdownVisible && (
            <div
              className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
              ref={dropdownRef} // Reference to dropdown menu
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
          />
        ))}

        {isAdding && (
          <CardDetails
            onClose={() => setIsAdding(false)}
            currentListId={id}
            boardId={boardId}
            allLists={allLists}
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
