

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
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
  targetCardId,
}) => {
  const BASE_URL = "http://localhost:3000";
  const [cards, setCards] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropPosition, setDropPosition] = useState(null);
  const [sortBy, setSortBy] = useState("position");
  const dropdownRef = useRef(null);
  const vectorRef = useRef(null);
  const columnRef = useRef(null);
  const cardsContainerRef = useRef(null);

  const fetchCards = async (sort = sortBy) => {
    try {
      let url = `${BASE_URL}/api/v1/cards/list/${id}/cards`;
      if (sort === "priority") {
        url += "?sortBy=priorityValue&sortOrder=desc";
      }
      console.log(
        `[Column.jsx] Fetching cards for list ${id} with URL: ${url}`
      );
      const res = await axios.get(url);
      console.log(
        `[Column.jsx] Fetched cards for list ${id} with sort ${sort}:`,
        res.data.data.cards
      );
      setCards(res.data.data.cards || []);
    } catch (err) {
      console.error(`[Column.jsx] Error loading cards for list ${id}:`, err);
      toast.error("Failed to load cards");
    }
  };

  useEffect(() => {
    if (id) {
      console.log(`[Column.jsx] Initial fetch for list ${id}`);
      fetchCards();
    }
  }, [id]);

  useEffect(() => {
    const handleRefreshList = (event) => {
      console.log(
        "[Column.jsx] refreshList event received:",
        event.detail,
        "Column id:",
        id
      );
      if (event.detail && event.detail.listId === id) {
        const newSortBy = event.detail.sortBy || "position";
        console.log(
          `[Column.jsx] Updating sortBy to ${newSortBy} for list ${id}`
        );
        setSortBy(newSortBy);
        if (event.detail.cards && newSortBy === "priority") {
          console.log(
            `[Column.jsx] Using cards from refreshList for list ${id}:`,
            event.detail.cards
          );
          setCards((prevCards) => {
            const existingCardIds = new Set(
              prevCards.map((card) => card.id || card._id)
            );
            const newCards = event.detail.cards.filter(
              (card) => !existingCardIds.has(card.id || card._id)
            );
            return [...prevCards, ...newCards];
          });
        } else {
          console.log(
            `[Column.jsx] Fetching cards for list ${id} with sort ${newSortBy}`
          );
          fetchCards(newSortBy);
        }
      }
    };

    window.addEventListener("refreshList", handleRefreshList);
    return () => window.removeEventListener("refreshList", handleRefreshList);
  }, [id]);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCard = async () => {
    if (!newTitle.trim()) return;

    try {
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const newCard = {
        id: tempId,
        title: newTitle,
        priority,
        attachments: [],
        commentCount: 0,
        labels: [],
      };
      console.log(`[Column.jsx] Adding temporary card to list ${id}:`, newCard);
      setCards([...cards, newCard]);

      const response = await axios.post(`${BASE_URL}/api/v1/cards`, {
        title: newTitle,
        listId: id,
        priority,
      });

      const createdCard = response.data.data;
      console.log(`[Column.jsx] Created card for list ${id}:`, createdCard);
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === tempId
            ? { ...createdCard, id: createdCard._id || createdCard.id }
            : card
        )
      );

      setNewTitle("");
      setPriority("Medium");
      setIsAdding(false);
      toast.success("Card created successfully");
    } catch (err) {
      console.error(`[Column.jsx] Error creating card for list ${id}:`, err);
      setCards(cards.filter((card) => card.id !== tempId));
      toast.error("Failed to create card");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);
      const res = await axios.patch(
        `${BASE_URL}/api/v1/lists/${id}/archive`,
        { archived: true },
        { withCredentials: true }
      );

      if (res.status === 200 || res.status === 204) {
        console.log(`[Column.jsx] List ${id} archived successfully`);
        setDropdownVisible(false);
        if (onArchive) {
          onArchive(id);
        }
      } else {
        console.warn(`[Column.jsx] Unexpected response status: ${res.status}`);
        toast.error("Unexpected response when archiving list");
      }
    } catch (err) {
      console.error(`[Column.jsx] Error archiving list ${id}:`, err);
      toast.error("Failed to archive list");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this list?"
    );
    if (!confirmDelete) return;

    console.log(`[Column.jsx] Deleting list ${id}`);
    setDropdownVisible(false);
    if (onDelete) onDelete(id);
  };

  const handleCardUpdate = async (originalListId, newListId) => {
    console.log(`[Column.jsx] handleCardUpdate for list ${id}:`, {
      originalListId,
      newListId,
    });
    if (originalListId && newListId) {
      if (originalListId === id || newListId === id) {
        await fetchCards();
      }
      if (originalListId !== newListId) {
        const otherListId = originalListId === id ? newListId : originalListId;
        console.log(
          `[Column.jsx] Dispatching refreshList for other list ${otherListId}`
        );
        const event = new CustomEvent("refreshList", {
          detail: { listId: otherListId, sortBy },
        });
        window.dispatchEvent(event);
      }
    } else {
      await fetchCards();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.getData("type") === "list") {
      e.stopPropagation();
      return;
    }
    setIsDraggingOver(true);

    const cardsContainer = columnRef.current.querySelector(".cards-container");
    if (!cardsContainer) {
      setDropPosition(0);
      return;
    }

    const cardElements = cardsContainer.querySelectorAll(".task-card");
    const mouseY = e.clientY;
    let newPosition = cardElements.length;

    if (cardElements.length > 0) {
      for (let i = 0; i < cardElements.length; i++) {
        const rect = cardElements[i].getBoundingClientRect();
        if (mouseY < rect.top) {
          newPosition = i;
          break;
        } else if (mouseY < rect.top + rect.height / 2) {
          newPosition = i;
          break;
        } else if (mouseY < rect.bottom) {
          newPosition = i + 1;
          break;
        }
      }
    }

    setDropPosition(newPosition);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.getData("type") === "list") {
      e.stopPropagation();
      return;
    }
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (columnRef.current && !columnRef.current.contains(e.relatedTarget)) {
      setIsDraggingOver(false);
      setDropPosition(null);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDropPosition(null);

    if (e.dataTransfer.getData("type") === "list") {
      e.stopPropagation();
      return;
    }

    const cardId = e.dataTransfer.getData("cardId");
    const sourceListId = e.dataTransfer.getData("sourceListId");
    const cardTitle = e.dataTransfer.getData("cardTitle");

    if (!cardId || !sourceListId) return;

    const targetPosition = dropPosition !== null ? dropPosition : cards.length;

    try {
      let updatedCards = [...cards];
      const isSameList = sourceListId === id;

      if (isSameList) {
        const cardIndex = cards.findIndex(
          (card) => (card.id || card._id) === cardId
        );
        if (
          cardIndex !== -1 &&
          cardIndex !== targetPosition &&
          cardIndex !== targetPosition - 1
        ) {
          const [movedCard] = updatedCards.splice(cardIndex, 1);
          updatedCards.splice(targetPosition, 0, movedCard);
          console.log(
            `[Column.jsx] Reordered cards in list ${id}:`,
            updatedCards
          );
          setCards(updatedCards);
        }
      } else {
        updatedCards.splice(targetPosition, 0, {
          id: cardId,
          title: cardTitle || "Untitled",
          priority: "Medium",
          attachments: [],
          commentCount: 0,
          labels: [],
        });
        console.log(
          `[Column.jsx] Added card to list ${id} from ${sourceListId}:`,
          updatedCards
        );
        setCards(updatedCards);
      }

      await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/move`,
        {
          listId: id,
          position: targetPosition,
        },
        { withCredentials: true }
      );

      handleCardUpdate(sourceListId, id);
      toast.success("Card moved successfully");
    } catch (err) {
      console.error(`[Column.jsx] Error moving card in list ${id}:`, err);
      fetchCards();
      toast.error("Failed to move card");
    }
  };

  console.log(`[Column.jsx] Rendering list ${id} with cards:`, cards);

  return (
    <div
      className={`rounded-lg mb-4 md:mb-0 flex flex-col min-w-[300px] h-full ${className} ${
        isDraggingOver ? "bg-gray-100" : ""
      }`}
      ref={columnRef}
    >
      <div
        className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm"
      >
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

      <div className="flex-grow flex flex-col h-full">
        <div
          ref={cardsContainerRef}
          className={`cards-container ${
            cards.length > 3 ? "overflow-y-auto" : "overflow-y-visible"
          }`}
          style={{
            maxHeight: cards.length > 3 ? `${148 * 3}px` : "none",
            scrollbarWidth: "thin",
            scrollbarColor: "#d1d5db transparent",
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <style>
            {`
              .cards-container::-webkit-scrollbar {
                width: 7px;
              }
              .cards-container::-webkit-scrollbar-thumb {
                background-color: #d1d5db;
                border-radius: 3px;
              }
              .cards-container::-webkit-scrollbar-track {
                background: transparent;
              }
            `}
          </style>
          <div>
            {cards.map((card, index) => (
              <>
                {dropPosition === index && isDraggingOver && (
                  <div className="h-3 bg-gray-300 rounded my-1"></div>
                )}
                <TaskCard
                  key={card.id || card._id}
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
                  containerRef={cardsContainerRef}
                  scrollToMe={targetCardId === (card.id || card._id)}
                />
              </>
            ))}
            {dropPosition === cards.length && isDraggingOver && (
              <div className="h-2 bg-gray-300 rounded my-1"></div>
            )}
          </div>
        </div>

        <div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-white py-3 w-full rounded-md border border-[#F2F4F7] shadow-lg transition-all hover:shadow-md"
              disabled={loading}
            >
              <img
                src={icon}
                className="w-5 h-5 block mx-auto hover:brightness-80"
                alt="Add task"
              />
            </button>
          )}

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
      </div>
    </div>
  );
};

export default Column;

