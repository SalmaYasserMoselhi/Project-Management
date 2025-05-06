"use client"

import { useRef, useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { createBoard, setBoardName, setBoardDescription } from "../features/Slice/WorkspaceSlice/boardsSlice"
import { usePopupAnimation } from "../utils/popup-animations"

const AddBoardPopup = ({ onClose, workspaceId, fetchBoardsAgain }) => {
  const dispatch = useDispatch()
  const modalRef = useRef(null)
  const backdropRef = useRef(null)
  const [isClosing, setIsClosing] = useState(false)
  const { boardName, boardDescription, createBoardLoading, createBoardError } = useSelector((state) => state.boards)

  // Use the standardized popup animation
  usePopupAnimation()

  // Handle closing with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 200) // Match animation duration
  }

  // Setup animation for popup
  useEffect(() => {
    const handleAnimationEnd = (e) => {
      if (e.target === modalRef.current && isClosing) {
        onClose()
      }
    }

    if (modalRef.current) {
      modalRef.current.addEventListener("animationend", handleAnimationEnd)
    }

    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener("animationend", handleAnimationEnd)
      }
    }
  }, [isClosing, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      // Validate workspace ID exists
      if (!workspaceId) {
        throw new Error("No workspace selected. Please try again.")
      }

      // Validate board name
      if (!boardName.trim()) {
        throw new Error("Board name is required")
      }

      const resultAction = await dispatch(
        createBoard({
          workspaceId,
          name: boardName.trim(),
          description: boardDescription.trim() || undefined,
        }),
      )

      if (createBoard.fulfilled.match(resultAction)) {
        // Refresh parent component's board list
        if (fetchBoardsAgain) {
          fetchBoardsAgain()
        }

        // Close the popup
        handleClose()
      }
    } catch (err) {
      console.error("Error creating board:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] add-board-popup" onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={`fixed inset-0 popup-backdrop ${isClosing ? "popup-closing" : ""}`}
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
      />

      {/* Popup Content Container */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[202]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content with ref */}
        <div
          ref={modalRef}
          className={`bg-white p-6 rounded-lg shadow-lg w-[450px] popup-content ${isClosing ? "popup-closing" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Board</h2>

          {createBoardError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{createBoardError}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Board name</label>
              <input
                type="text"
                placeholder="Web Design"
                value={boardName}
                onChange={(e) => dispatch(setBoardName(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61] text-gray-700 text-sm"
                disabled={createBoardLoading}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                placeholder="A inventore reiciendis id nemo quo. Voluptatibus rerum fugit explicabo hic aperiam. Veritatis quos aut vero eum omnis."
                value={boardDescription}
                onChange={(e) => dispatch(setBoardDescription(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61] text-gray-700 text-sm resize-none h-24"
                disabled={createBoardLoading}
              />
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-6 py-2 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium rounded-md transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBoardLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Done"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddBoardPopup
