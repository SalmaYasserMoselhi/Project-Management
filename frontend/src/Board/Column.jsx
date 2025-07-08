import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import TaskCard from "./TaskCard";
import icon from "../assets/icon.png";
import CardDetails from "../Card/CardDetails";
import DeleteConfirmationDialog from "../Components/DeleteConfirmationDialog";
import React from "react";

// Request manager to prevent duplicate requests and implement caching
class RequestManager {
  constructor() {
    this.activeRequests = new Map();
    this.cache = new Map();
    this.lastFetchTime = new Map();
    this.CACHE_DURATION = 30000; // 30 seconds
    this.REQUEST_DEBOUNCE = 500; // 500ms debounce
  }

  createCacheKey(listId, sortBy = "position", sortOrder = "asc") {
    return `${listId}-${sortBy}-${sortOrder}`;
  }

  isCacheValid(cacheKey) {
    const lastFetch = this.lastFetchTime.get(cacheKey);
    return lastFetch && Date.now() - lastFetch < this.CACHE_DURATION;
  }

  getCachedData(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    return null;
  }

  async fetchCards(listId, sortBy = "position", sortOrder = "asc") {
    const cacheKey = this.createCacheKey(listId, sortBy, sortOrder);

    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log(`[RequestManager] Using cached data for list ${listId}`);
      return cachedData;
    }

    // Check if request is already in progress
    if (this.activeRequests.has(cacheKey)) {
      console.log(
        `[RequestManager] Waiting for existing request for list ${listId}`
      );
      return this.activeRequests.get(cacheKey);
    }

    // Create new request
    const BASE_URL = "http://localhost:3000";
    let url = `${BASE_URL}/api/v1/cards/list/${listId}/cards`;

    // Build query parameters
    const params = new URLSearchParams();
    if (sortBy && sortBy !== "position") {
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
    } else {
      // Default position sorting
      params.append("sortBy", "position");
      params.append("sortOrder", sortOrder);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const requestPromise = axios
      .get(url)
      .then((res) => {
        const cards = res.data.data.cards || [];
        this.cache.set(cacheKey, cards);
        this.lastFetchTime.set(cacheKey, Date.now());
        console.log(
          `[RequestManager] Fetched and cached data for list ${listId}`
        );
        return cards;
      })
      .catch((err) => {
        console.error(
          `[RequestManager] Error fetching cards for list ${listId}:`,
          err
        );
        throw err;
      })
      .finally(() => {
        this.activeRequests.delete(cacheKey);
      });

    this.activeRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  invalidateCache(listId) {
    // Clear all cache entries for this list
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${listId}-`)) {
        this.cache.delete(key);
        this.lastFetchTime.delete(key);
      }
    }
    console.log(`[RequestManager] Invalidated cache for list ${listId}`);
  }

  invalidateAllCache() {
    this.cache.clear();
    this.lastFetchTime.clear();
    console.log(`[RequestManager] Invalidated all cache`);
  }
}

// Global request manager instance
const requestManager = new RequestManager();

const Column = ({
  id,
  title,
  className,
  onDelete,
  onArchive,
  boardId,
  allLists,
  targetCardId,
  cards: initialCards = [],
}) => {
  const BASE_URL = "http://localhost:3000";
  const [cards, setCards] = useState(initialCards);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropPosition, setDropPosition] = useState(null);
  const [sortBy, setSortBy] = useState("position");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredCards, setFilteredCards] = useState([]);
  const dropdownRef = useRef(null);
  const vectorRef = useRef(null);
  const columnRef = useRef(null);
  const cardsContainerRef = useRef(null);
  const fetchTimeoutRef = useRef(null);

  useEffect(() => {
    // If we receive initialCards from parent (Board), always set isFiltered to true (even if empty)
    if (Array.isArray(initialCards)) {
      setCards(initialCards);
      setIsFiltered(true);
      setFilteredCards(initialCards);
    }
  }, [initialCards, id]);

  const fetchCards = async (
    sort = sortBy,
    sortOrder = "asc",
    force = false
  ) => {
    // Skip if filtered and no force flag
    if (isFiltered && !force) {
      console.log(
        `[Column.jsx] Skipping fetchCards for list ${id} - filters are active`
      );
      return;
    }

    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce rapid successive calls
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const cards = await requestManager.fetchCards(id, sort, sortOrder);
        setCards(cards);
        setIsFiltered(false);
        setFilteredCards([]);
      } catch (err) {
        // Only show error if not a 304 (not modified) response
        if (err.response?.status !== 304) {
          if (err.response?.status === 403) {
            toast.error("You don't have permission to view cards in this list");
          } else if (err.response?.status === 404) {
            toast.error("List not found");
          } else if (err.response?.status >= 500) {
            toast.error("Server error. Please refresh the page");
          } else {
            toast.error("Unable to load cards. Please try again");
          }
        }
      }
    }, 100); // Small debounce delay
  };

  useEffect(() => {
    // Only fetch cards if not filtered and no initial cards
    if (id && !isFiltered && (!initialCards || initialCards.length === 0)) {
      fetchCards();
    }
  }, [id, initialCards, isFiltered]);

  useEffect(() => {
    const handleRefreshList = (event) => {
      if (event.detail && event.detail.listId === id) {
        const newSortBy = event.detail.sortBy || "position";
        const newSortOrder = event.detail.sortOrder || "asc";
        setSortBy(newSortBy);

        if (event.detail.cards) {
          // Force update by creating a new array and updating state
          const newCards = [...event.detail.cards];
          setCards(newCards);

          // Update filter state based on whether we're receiving filtered cards
          const isFilteredState =
            event.detail.isFiltered !== undefined
              ? event.detail.isFiltered
              : true;
          setIsFiltered(isFilteredState);
          if (isFilteredState) {
            setFilteredCards(newCards);
          } else {
            setFilteredCards([]);
          }
        } else if (!isFiltered) {
          // Only fetch if we don't have the data already
          fetchCards(newSortBy, newSortOrder);
        }
      }
    };

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
    window.addEventListener("refreshList", handleRefreshList);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("refreshList", handleRefreshList);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [id, isFiltered]);

  const handleArchive = async () => {
    try {
      await axios.patch(
        `${BASE_URL}/api/v1/lists/${id}/archive`,
        {},
        { withCredentials: true }
      );
      if (onArchive) onArchive(id);
      toast.success("List archived successfully");
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("You don't have permission to archive this list");
      } else if (err.response?.status === 404) {
        toast.error("List not found");
      } else {
        toast.error("Unable to archive list. Please try again");
      }
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setDropdownVisible(false);
  };

  const handleEditRequest = () => {
    const event = new CustomEvent("listEditRequest", {
      detail: {
        listId: id,
        listName: title,
      },
    });
    window.dispatchEvent(event);
    setDropdownVisible(false);
  };

  const handleConfirmDelete = () => {
    console.log(`[Column.jsx] Deleting list ${id}`);
    if (onDelete) onDelete(id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  useEffect(() => {
    const handleCardMoved = (e) => {
      const { cardId, sourceListId, destListId } = e.detail;

      // Remove card from source list
      if (sourceListId === id && sourceListId !== destListId) {
        setCards((prev) => prev.filter((c) => (c.id || c._id) !== cardId));
      }
    };

    const handleCardMoveReverted = (e) => {
      const { cardId, sourceListId, destListId } = e.detail;

      // If this is the source list, invalidate cache and refetch
      if (sourceListId === id && sourceListId !== destListId) {
        console.log(
          `[Column.jsx] Restoring card ${cardId} to source list ${id} after failed move`
        );
        // Invalidate cache for this list
        requestManager.invalidateCache(id);
        // Force fetch the current cards to restore the original state
        fetchCards(sortBy, "asc", true);
      }
    };

    const handleCardUpdated = (e) => {
      const { cardId, updatedData } = e.detail;
      console.log(
        `[Column.jsx] Card ${cardId} updated in list ${id}:`,
        updatedData
      );

      // Check if the card was moved to a different list
      if (updatedData.listId && updatedData.listId !== id) {
        // Remove the card from this list since it was moved to a different list
        setCards((prev) => {
          const filteredCards = prev.filter((c) => (c.id || c._id) !== cardId);
          console.log(
            `[Column.jsx] Removed card ${cardId} from list ${id} after move to ${updatedData.listId}`
          );
          return filteredCards;
        });
        return;
      }

      // Check if this card belongs to this list
      if (updatedData.listId && updatedData.listId === id) {
        // Invalidate cache since we have new data
        requestManager.invalidateCache(id);

        // Update the specific card in the list or add it if it's new
        setCards((prev) => {
          const cardIndex = prev.findIndex((c) => (c.id || c._id) === cardId);
          if (cardIndex !== -1) {
            // Update existing card
            const updatedCards = [...prev];
            updatedCards[cardIndex] = {
              ...updatedCards[cardIndex],
              ...updatedData,
              // Preserve existing properties that might not be in updatedData
              id: updatedCards[cardIndex].id || updatedCards[cardIndex]._id,
              _id: updatedCards[cardIndex]._id || updatedCards[cardIndex].id,
            };
            console.log(
              `[Column.jsx] Updated existing card ${cardId} in list ${id}:`,
              updatedCards[cardIndex]
            );
            return updatedCards;
          } else {
            // Add new card to the list
            const newCard = {
              id: cardId,
              _id: cardId,
              title: updatedData.title || "Untitled",
              priority: updatedData.priority || "Medium",
              attachments: updatedData.attachments || [],
              labels: updatedData.labels || [],
              members: updatedData.members || [],
              state: updatedData.state || { current: "active" },
              position: updatedData.position || Date.now(),
              ...updatedData,
            };
            const updatedCards = [...prev, newCard];
            console.log(
              `[Column.jsx] Added new card ${cardId} to list ${id}:`,
              newCard
            );
            return updatedCards;
          }
        });
      } else if (!updatedData.listId) {
        // If no listId is specified, try to update existing card only
        setCards((prev) => {
          const cardIndex = prev.findIndex((c) => (c.id || c._id) === cardId);
          if (cardIndex !== -1) {
            // Invalidate cache for any updates
            requestManager.invalidateCache(id);

            const updatedCards = [...prev];
            updatedCards[cardIndex] = {
              ...updatedCards[cardIndex],
              ...updatedData,
              // Preserve existing properties that might not be in updatedData
              id: updatedCards[cardIndex].id || updatedCards[cardIndex]._id,
              _id: updatedCards[cardIndex]._id || updatedCards[cardIndex].id,
            };
            console.log(
              `[Column.jsx] Updated card ${cardId} in list ${id}:`,
              updatedCards[cardIndex]
            );
            return updatedCards;
          }
          return prev;
        });
      }
    };

    const handleCardArchived = (e) => {
      const { cardId, listId } = e.detail;
      console.log(
        `[Column.jsx] Card ${cardId} archived from list ${listId}, current list ${id}`
      );

      // Only remove the card if it's in this list
      if (listId === id) {
        // Invalidate cache since card is removed
        requestManager.invalidateCache(id);

        setCards((prev) => {
          const filteredCards = prev.filter((c) => (c.id || c._id) !== cardId);
          console.log(
            `[Column.jsx] Removed archived card ${cardId} from list ${id}. Cards remaining: ${filteredCards.length}`
          );
          return filteredCards;
        });
      }
    };

    const handleCardDeleted = (e) => {
      const { cardId, listId } = e.detail;
      console.log(
        `[Column.jsx] Card ${cardId} deleted from list ${listId}, current list ${id}`
      );

      // Only remove the card if it's in this list
      if (listId === id) {
        // Invalidate cache since card is removed
        requestManager.invalidateCache(id);

        setCards((prev) => {
          const filteredCards = prev.filter((c) => (c.id || c._id) !== cardId);
          console.log(
            `[Column.jsx] Removed deleted card ${cardId} from list ${id}. Cards remaining: ${filteredCards.length}`
          );
          return filteredCards;
        });
      }
    };

    window.addEventListener("cardMoved", handleCardMoved);
    window.addEventListener("cardMoveReverted", handleCardMoveReverted);
    window.addEventListener("cardUpdated", handleCardUpdated);
    window.addEventListener("cardArchived", handleCardArchived);
    window.addEventListener("cardDeleted", handleCardDeleted);
    return () => {
      window.removeEventListener("cardMoved", handleCardMoved);
      window.removeEventListener("cardMoveReverted", handleCardMoveReverted);
      window.removeEventListener("cardUpdated", handleCardUpdated);
      window.removeEventListener("cardArchived", handleCardArchived);
      window.removeEventListener("cardDeleted", handleCardDeleted);
    };
  }, [id, sortBy]);

  const handleCardUpdate = (update) => {
    if (update && update.id) {
      // Invalidate cache for any card updates
      requestManager.invalidateCache(id);

      setCards((prevCards) =>
        prevCards.map((card) =>
          (card.id || card._id) === update.id ? { ...card, ...update } : card
        )
      );
      if (update.forceRefresh) {
        // Only force refresh if absolutely necessary
        fetchCards(sortBy, "asc", true);
      }
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
    const isCompleted = e.dataTransfer.getData("isCompleted") === "true";
    const priority = e.dataTransfer.getData("priority") || "Medium";
    const labels = JSON.parse(e.dataTransfer.getData("labels") || "[]");

    if (!cardId || !sourceListId) return;

    const targetPosition = dropPosition !== null ? dropPosition : cards.length;
    let cardHasMoved = false;

    // Store original state for potential revert
    const originalCards = [...cards];
    const isSameList = sourceListId === id;

    try {
      let updatedCards = [...cards];

      if (isSameList) {
        const cardIndex = cards.findIndex(
          (card) => (card.id || card._id) === cardId
        );
        if (
          cardIndex !== -1 &&
          cardIndex !== targetPosition &&
          cardIndex !== targetPosition - 1
        ) {
          cardHasMoved = true;
          const [movedCard] = updatedCards.splice(cardIndex, 1);
          updatedCards.splice(targetPosition, 0, movedCard);
          console.log(
            `[Column.jsx] Reordered cards in list ${id}:`,
            updatedCards
          );
          setCards(updatedCards);
        }
      } else {
        cardHasMoved = true;
        updatedCards.splice(targetPosition, 0, {
          id: cardId,
          title: cardTitle || "Untitled",
          priority: priority,
          attachments: [],
          commentCount: 0,
          labels: labels,
          state: { current: isCompleted ? "completed" : "active" },
        });
        console.log(
          `[Column.jsx] Added card to list ${id} from ${sourceListId}:`,
          updatedCards
        );
        setCards(updatedCards);
      }

      if (cardHasMoved) {
        if (!isSameList) {
          // Dispatch a custom event to notify other columns
          window.dispatchEvent(
            new CustomEvent("cardMoved", {
              detail: { cardId, sourceListId, destListId: id },
            })
          );
        }

        await axios.patch(
          `${BASE_URL}/api/v1/cards/${cardId}/move`,
          {
            listId: id,
            position: targetPosition,
          },
          { withCredentials: true }
        );

        toast.success("Card moved successfully");
      }
    } catch (err) {
      console.error(`[Column.jsx] Error moving card in list ${id}:`, err);

      // Revert optimistic changes immediately
      if (cardHasMoved) {
        console.log(`[Column.jsx] Reverting optimistic changes for list ${id}`);
        setCards(originalCards);

        // Dispatch revert event to notify other columns to also revert changes
        if (!isSameList) {
          window.dispatchEvent(
            new CustomEvent("cardMoveReverted", {
              detail: { cardId, sourceListId, destListId: id },
            })
          );
        }

        // Show appropriate error message based on error type
        if (err.response?.status === 403) {
          toast.error("You don't have permission to move this card");
        } else if (err.response?.status === 404) {
          toast.error("Card or list not found");
        } else {
          toast.error("Failed to move card");
        }
      }

      // No fallback fetch needed - UI reversion is sufficient
    }
  };

  return (
    <div
      className={`rounded-lg mb-4 lg:mb-0 flex flex-col w-full lg:min-w-[300px] h-full ${className} ${
        isDraggingOver ? "bg-gray-100" : ""
      }`}
      ref={columnRef}
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
                onClick={handleEditRequest}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
              >
                Edit
              </button>
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
          className={`cards-container custom-scrollbar flex-grow ${
            cards.length > 3 ? "overflow-y-auto" : "overflow-y-visible"
          }`}
          style={{
            maxHeight: cards.length > 3 ? `${148 * 3}px` : "none",
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {cards && cards.length > 0 ? (
            <div>
              {cards.map((card, index) => (
                <React.Fragment
                  key={`${card.id || card._id}-${card.title}-${card.priority}-${
                    card.labels?.length || 0
                  }`}
                >
                  {dropPosition === index && isDraggingOver && (
                    <div className="h-3 bg-purple-200 rounded my-1"></div>
                  )}
                  <TaskCard
                    id={card.id || card._id}
                    title={card.title}
                    priority={card.priority || "Medium"}
                    fileCount={card.attachments?.length || 0}
                    listId={id}
                    boardId={boardId}
                    allLists={allLists}
                    labels={card.labels || []}
                    onCardUpdate={handleCardUpdate}
                    containerRef={cardsContainerRef}
                    scrollToMe={targetCardId === (card.id || card._id)}
                    members={card.members || []}
                    isCompleted={card.state?.current === "completed"}
                  />
                </React.Fragment>
              ))}
              {dropPosition === cards.length && isDraggingOver && (
                <div className="h-2 bg-purple-200 rounded my-1"></div>
              )}
            </div>
          ) : isDraggingOver ? (
            <div className="h-full w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center m-2">
              <span className="text-gray-500">Drop card here</span>
            </div>
          ) : null}
        </div>

        <div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-white py-3 w-full rounded-md border border-[#F2F4F7] shadow-sm transition-all button-hover"
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

      {showDeleteConfirm && (
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete List"
          itemName={title}
          itemType="list"
          confirmText="Delete List"
          cancelText="Cancel"
          loading={loading}
        />
      )}
    </div>
  );
};

export default Column;
