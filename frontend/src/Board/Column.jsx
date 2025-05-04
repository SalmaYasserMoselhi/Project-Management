
import { useEffect, useState } from "react";
import axios from "axios";
import vector from "../assets/Vector.png";
import TaskCard from "./TaskCard";
import icon from "../assets/icon.png";

const Column = ({ id, title, className }) => {
  const BASE_URL = "http://localhost:3000";
  const [cards, setCards] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await axios.get(`/api/v1/cards/list/${id}/cards`);
        setCards(res.data.data.cards || []);
      } catch (err) {
        console.error("Error loading cards:", err);
      }
    };

    if (id) fetchCards();
  }, [id]);

  const handleAddCard = async () => {
    if (!newTitle.trim()) return;

    try {
      setLoading(true);
      const res = axios.post(`${BASE_URL}/api/v1/cards`, {
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

  return (
    <div className={`p-2 rounded-lg mb-4 md:mb-0 md:mr-4 ${className} min-w-[300px]`}>
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
        <div className="flex items-center">
          <h3 className="text-black font-semibold me-2">
            {title}
            <span className="px-2 py-1 rounded-full text-sm ms-2" style={{ backgroundColor: "#A855F71A" }}>
              {cards.length}
            </span>
          </h3>
        </div>
        <div className="flex items-center">
          <img src={vector} alt="Options" className="w-[18px] h-[4px]" />
        </div>
      </div>

      <div>
        {cards.map((card) => (
          <TaskCard
            key={card.id}
            title={card.title}
            priority={card.priority || "Medium"}
            fileCount={card.attachments?.length || 0}
            commentCount={card.commentCount || 0}
          />
        ))}

        {isAdding && (
          <div className="bg-white border rounded-md p-2 mt-2 shadow-sm">
            <input
              type="text"
              placeholder="Card title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-1 border rounded mb-2"
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full p-1 border rounded mb-2"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleAddCard}
                className="bg-[#4D2D61] text-white px-3 py-1 rounded text-sm"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Card"}
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="text-sm text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
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
