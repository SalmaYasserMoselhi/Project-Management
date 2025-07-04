
"use client"

import { useEffect, useState, useRef } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import TaskCard from "./TaskCard"
import icon from "../assets/icon.png"
import CardDetails from "../Card/CardDetails"
import DeleteConfirmationDialog from "../Components/DeleteConfirmationDialog"
import React from "react"

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
  const BASE_URL = "http://localhost:3000"
  const [cards, setCards] = useState(initialCards)
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [loading, setLoading] = useState(false)
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [dropPosition, setDropPosition] = useState(null)
  const [sortBy, setSortBy] = useState("position")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isFiltered, setIsFiltered] = useState(false)
  const [filteredCards, setFilteredCards] = useState([])
  const dropdownRef = useRef(null)
  const vectorRef = useRef(null)
  const columnRef = useRef(null)
  const cardsContainerRef = useRef(null)

  useEffect(() => {
    // If we receive initialCards from parent (Board), always set isFiltered to true (even if empty)
    if (Array.isArray(initialCards)) {
      setCards(initialCards)
      setIsFiltered(true)
      setFilteredCards(initialCards)
    }
  }, [initialCards, id])

  const fetchCards = async (sort = sortBy, sortOrder = "asc") => {
    if (isFiltered && filteredCards.length >= 0) {
      console.log(`[Column.jsx] Skipping fetchCards for list ${id} - filters are active`)
      return
    }

    try {
      let url = `${BASE_URL}/api/v1/cards/list/${id}/cards`

      // Build query parameters
      const params = new URLSearchParams()
      if (sort && sort !== "position") {
        params.append("sortBy", sort)
        params.append("sortOrder", sortOrder)
      } else {
        // Default position sorting
        params.append("sortBy", "position")
        params.append("sortOrder", sortOrder)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const res = await axios.get(url)
      const cards = res.data.data.cards || []
      setCards(cards)
      setIsFiltered(false)
      setFilteredCards([])
    } catch (err) {
      toast.error("Failed to load cards")
    }
  }

  useEffect(() => {
    // Only fetch cards if not filtered and no initial cards
    if (id && !isFiltered && (!initialCards || initialCards.length === 0)) {
      fetchCards()
    }
  }, [id, initialCards, isFiltered])

  useEffect(() => {
    const handleRefreshList = (event) => {
      if (event.detail && event.detail.listId === id) {
        const newSortBy = event.detail.sortBy || "position"
        const newSortOrder = event.detail.sortOrder || "asc"
        setSortBy(newSortBy)

        if (event.detail.cards) {
          // Force update by creating a new array and updating state
          const newCards = [...event.detail.cards]
          setCards(newCards)

          // Update filter state based on whether we're receiving filtered cards
          const isFilteredState = event.detail.isFiltered !== undefined ? event.detail.isFiltered : true
          setIsFiltered(isFilteredState)
          if (isFilteredState) {
            setFilteredCards(newCards)
          } else {
            setFilteredCards([])
          }
        } else if (!isFiltered) {
          fetchCards(newSortBy, newSortOrder)
        }
      }
    }

    window.addEventListener("refreshList", handleRefreshList)
    return () => window.removeEventListener("refreshList", handleRefreshList)
  }, [id, isFiltered])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        vectorRef.current &&
        !vectorRef.current.contains(event.target)
      ) {
        setDropdownVisible(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleArchive = async () => {
    try {
      setLoading(true)
      const res = await axios.patch(
        `${BASE_URL}/api/v1/lists/${id}/archive`,
        { archived: true },
        { withCredentials: true },
      )

      if (res.status === 200 || res.status === 204) {
        console.log(`[Column.jsx] List ${id} archived successfully`)
        setDropdownVisible(false)
        if (onArchive) {
          onArchive(id)
        }
      } else {
        console.warn(`[Column.jsx] Unexpected response status: ${res.status}`)
        toast.error("Unexpected response when archiving list")
      }
    } catch (err) {
      console.error(`[Column.jsx] Error archiving list ${id}:`, err)
      toast.error("Failed to archive list")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
    setDropdownVisible(false)
  }

  const handleEditRequest = () => {
    // Emit an event to the parent Board component to open the edit modal
    const event = new CustomEvent("editListRequest", {
      detail: {
        listId: id,
        listName: title,
        boardId: boardId,
      },
    })
    window.dispatchEvent(event)
    setDropdownVisible(false)
  }

  const handleConfirmDelete = () => {
    console.log(`[Column.jsx] Deleting list ${id}`)
    if (onDelete) onDelete(id)
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  useEffect(() => {
    const handleCardMoved = (e) => {
      const { cardId, sourceListId, destListId } = e.detail

      // Remove card from source list
      if (sourceListId === id && sourceListId !== destListId) {
        setCards((prev) => prev.filter((c) => (c.id || c._id) !== cardId))
      }
    }

    const handleCardUpdated = (e) => {
      const { cardId, updatedData } = e.detail
      console.log(`[Column.jsx] Card ${cardId} updated in list ${id}:`, updatedData)

      // Update the specific card in the list
      setCards((prev) => {
        const cardIndex = prev.findIndex((c) => (c.id || c._id) === cardId)
        if (cardIndex !== -1) {
          const updatedCards = [...prev]
          updatedCards[cardIndex] = {
            ...updatedCards[cardIndex],
            ...updatedData,
            // Preserve existing properties that might not be in updatedData
            id: updatedCards[cardIndex].id || updatedCards[cardIndex]._id,
            _id: updatedCards[cardIndex]._id || updatedCards[cardIndex].id,
          }
          console.log(`[Column.jsx] Updated card ${cardId} in list ${id}:`, updatedCards[cardIndex])
          return updatedCards
        }
        return prev
      })
    }

    const handleCardArchived = (e) => {
      const { cardId, listId } = e.detail
      console.log(`[Column.jsx] Card ${cardId} archived from list ${listId}, current list ${id}`)

      // Only remove the card if it's in this list
      if (listId === id) {
        setCards((prev) => {
          const filteredCards = prev.filter((c) => (c.id || c._id) !== cardId)
          console.log(
            `[Column.jsx] Removed archived card ${cardId} from list ${id}. Cards remaining: ${filteredCards.length}`,
          )
          return filteredCards
        })
      }
    }

    const handleCardDeleted = (e) => {
      const { cardId, listId } = e.detail
      console.log(`[Column.jsx] Card ${cardId} deleted from list ${listId}, current list ${id}`)

      // Only remove the card if it's in this list
      if (listId === id) {
        setCards((prev) => {
          const filteredCards = prev.filter((c) => (c.id || c._id) !== cardId)
          console.log(
            `[Column.jsx] Removed deleted card ${cardId} from list ${id}. Cards remaining: ${filteredCards.length}`,
          )
          return filteredCards
        })
      }
    }

    window.addEventListener("cardMoved", handleCardMoved)
    window.addEventListener("cardUpdated", handleCardUpdated)
    window.addEventListener("cardArchived", handleCardArchived)
    window.addEventListener("cardDeleted", handleCardDeleted)
    return () => {
      window.removeEventListener("cardMoved", handleCardMoved)
      window.removeEventListener("cardUpdated", handleCardUpdated)
      window.removeEventListener("cardArchived", handleCardArchived)
      window.removeEventListener("cardDeleted", handleCardDeleted)
    }
  }, [id])

  const handleCardUpdate = (update) => {
    if (update && update.id) {
      setCards((prevCards) =>
        prevCards.map((card) => ((card.id || card._id) === update.id ? { ...card, ...update } : card)),
      )
      if (update.forceRefresh) {
        fetchCards()
      }
    } else {
      // fallback: refetch or other logic
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (e.dataTransfer.getData("type") === "list") {
      e.stopPropagation()
      return
    }
    setIsDraggingOver(true)

    const cardsContainer = columnRef.current.querySelector(".cards-container")
    if (!cardsContainer) {
      setDropPosition(0)
      return
    }

    const cardElements = cardsContainer.querySelectorAll(".task-card")
    const mouseY = e.clientY
    let newPosition = cardElements.length

    if (cardElements.length > 0) {
      for (let i = 0; i < cardElements.length; i++) {
        const rect = cardElements[i].getBoundingClientRect()
        if (mouseY < rect.top) {
          newPosition = i
          break
        } else if (mouseY < rect.top + rect.height / 2) {
          newPosition = i
          break
        } else if (mouseY < rect.bottom) {
          newPosition = i + 1
          break
        }
      }
    }

    setDropPosition(newPosition)
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    if (e.dataTransfer.getData("type") === "list") {
      e.stopPropagation()
      return
    }
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    if (columnRef.current && !columnRef.current.contains(e.relatedTarget)) {
      setIsDraggingOver(false)
      setDropPosition(null)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDraggingOver(false)
    setDropPosition(null)

    if (e.dataTransfer.getData("type") === "list") {
      e.stopPropagation()
      return
    }

    const cardId = e.dataTransfer.getData("cardId")
    const sourceListId = e.dataTransfer.getData("sourceListId")
    const cardTitle = e.dataTransfer.getData("cardTitle")

    if (!cardId || !sourceListId) return

    const targetPosition = dropPosition !== null ? dropPosition : cards.length
    let cardHasMoved = false

    try {
      const updatedCards = [...cards]
      const isSameList = sourceListId === id

      if (isSameList) {
        const cardIndex = cards.findIndex((card) => (card.id || card._id) === cardId)
        if (cardIndex !== -1 && cardIndex !== targetPosition && cardIndex !== targetPosition - 1) {
          cardHasMoved = true
          const [movedCard] = updatedCards.splice(cardIndex, 1)
          updatedCards.splice(targetPosition, 0, movedCard)
          console.log(`[Column.jsx] Reordered cards in list ${id}:`, updatedCards)
          setCards(updatedCards)
        }
      } else {
        cardHasMoved = true
        updatedCards.splice(targetPosition, 0, {
          id: cardId,
          title: cardTitle || "Untitled",
          priority: "Medium",
          attachments: [],
          commentCount: 0,
          labels: [],
        })
        console.log(`[Column.jsx] Added card to list ${id} from ${sourceListId}:`, updatedCards)
        setCards(updatedCards)
      }

      if (cardHasMoved) {
        if (!isSameList) {
          // Dispatch a custom event to notify other columns
          window.dispatchEvent(
            new CustomEvent("cardMoved", {
              detail: { cardId, sourceListId, destListId: id },
            }),
          )
        }

        await axios.patch(
          `${BASE_URL}/api/v1/cards/${cardId}/move`,
          {
            listId: id,
            position: targetPosition,
          },
          { withCredentials: true },
        )

        toast.success("Card moved successfully")
      }
    } catch (err) {
      console.error(`[Column.jsx] Error moving card in list ${id}:`, err)
      // Only fetch cards if not in filtered state
      if (!isFiltered) {
        fetchCards()
      }
      if (cardHasMoved) toast.error("Failed to move card")
    }
  }

  return (
    <div
      className={`rounded-lg mb-3 lg:mb-4 flex flex-col min-w-[280px] sm:min-w-[300px] h-full ${className} ${
        isDraggingOver ? "bg-gray-100" : ""
      }`}
      ref={columnRef}
    >
      <div className="flex justify-between items-center mb-3 lg:mb-4 bg-white p-3 rounded-lg shadow-sm w-[300px]">
        <div className="flex items-center min-w-0 flex-1 ">
          <h3 className="text-black font-semibold text-sm lg:text-base truncate">
            {title}
            <span
              className="px-2 py-1 rounded-full text-xs lg:text-sm ml-2 inline-block"
              style={{ backgroundColor: "#A855F71A" }}
            >
              {cards.length}
            </span>
          </h3>
        </div>
        <div className="flex items-center relative ml-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 18 24"
            onClick={() => setDropdownVisible(!dropdownVisible)}
            ref={vectorRef}
            className="cursor-pointer lg:w-6 lg:h-6"
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
                className="w-full text-left px-3 lg:px-4 py-2 text-xs lg:text-sm text-gray-700 hover:bg-red-50"
              >
                Edit
              </button>
              <button
                onClick={handleArchive}
                className="w-full text-left px-3 lg:px-4 py-2 text-xs lg:text-sm text-gray-700 hover:bg-red-50"
              >
                Archive
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 lg:px-4 py-2 text-xs lg:text-sm text-red-600 hover:bg-red-50"
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
                  key={`${card.id || card._id}-${card.title}-${card.priority}-${card.labels?.length || 0}`}
                >
                  {dropPosition === index && isDraggingOver && (
                    <div className="h-2 lg:h-3 bg-purple-200 rounded my-1"></div>
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
              <span className="text-gray-500 text-sm">Drop card here</span>
            </div>
          ) : null}
        </div>

        <div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-white py-2 lg:py-3 w-full rounded-md border max-w-[300px] border-[#F2F4F7] shadow-sm transition-all button-hover"
              disabled={loading}
            >
              <img
                src={icon || "/placeholder.svg"}
                className="w-4 lg:w-5 h-4 lg:h-5 block mx-auto hover:brightness-80"
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
  )
}

export default Column


