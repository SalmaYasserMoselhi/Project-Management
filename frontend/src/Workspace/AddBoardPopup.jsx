import { useState, useRef } from "react";
import api from "../api";
import toast from "react-hot-toast";

const AddBoardPopup = ({ onClose, workspaceId, fetchBoardsAgain }) => {
  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);
      setError("");

      // Validate workspace ID exists
      if (!workspaceId) {
        throw new Error("No workspace selected. Please try again.");
      }

      // Validate board name
      if (!boardName.trim()) {
        throw new Error("Board name is required");
      }

      // API call to create board
      const response = await api.post(`/api/v1/boards`, {
        workspaceId: workspaceId,
        name: boardName.trim(),
        description: description.trim() || undefined,
      });

      if (response.data?.status === "success") {
        // Show success message
        toast.success("Board created successfully!", {
          duration: 3000,
          position: "top-right",
          style: {
            background: "#4B2D73",
            color: "#fff",
          },
        });

        // Refresh parent component's board list
        if (fetchBoardsAgain) {
          fetchBoardsAgain();
        }

        // Close the popup
        onClose();
      } else {
        throw new Error(response.data?.message || "Failed to create board");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to create board. Please try again.";
      setError(errorMessage);

      // Show error toast
      toast.error(errorMessage, {
        duration: 4000,
        position: "top-right",
        style: {
          background: "#F9E4E4",
          color: "#DC2626",
          border: "1px solid #DC2626",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] add-board-popup"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[0.5px] z-[201]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
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
          className="bg-white p-6 rounded-lg shadow-lg w-[450px] animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Add Board
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Board name
              </label>
              <input
                type="text"
                placeholder="Web Design"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-gray-700 text-sm"
                disabled={loading}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                placeholder="A inventore reiciendis id nemo quo. Voluptatibus rerum fugit explicabo hic aperiam. Veritatis quos aut vero eum omnis."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-gray-700 text-sm resize-none h-24"
                disabled={loading}
              />
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="bg-[#4B2D73] text-white py-2 px-6 rounded-md hover:bg-[#3D2460] font-medium text-sm disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
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
  );
};

export default AddBoardPopup;
