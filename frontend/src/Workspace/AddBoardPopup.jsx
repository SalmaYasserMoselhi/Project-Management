
// import  { useState } from "react";

// const AddBoardPopup = ({ onClose }) => {
//   const [boardName, setBoardName] = useState("");
//   const [description, setDescription] = useState("");

//   const handleBackdropClick = (e) => {
//     if (e.target.id === "popup-backdrop") {
//       onClose();
//     }
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log("Board Name:", boardName);
//     console.log("Description:", description);
//     onClose();
//   };

//   return (
//     <div
//       id="popup-backdrop"
//       onClick={handleBackdropClick}
//       className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center font-[Nunito]"
//     >
//       <div className="bg-white p-5 rounded-2xl shadow-lg relative w-[570px]">
//         {/* Title */}
//         <h2 className="text-3xl font-bold text-[#3E2C41] mb-4">
//           Add Board
//         </h2>

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="flex flex-col gap-4">
//           {/* Board Name */}
//           <div className="flex flex-col gap-2">
//             <label className="text-lg font-semibold text-gray-900">
//               Board name
//             </label>
//             <input
//               type="text"
//               placeholder="Web Design"
//               value={boardName}
//               onChange={(e) => setBoardName(e.target.value)}
//               className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4D2D61] text-gray-700"
//             />
//           </div>

//           {/* Description */}
//           <div className="flex flex-col gap-2">
//             <label className="text-lg font-semibold text-gray-900">
//               Description
//             </label>
//             <textarea
//               placeholder="A inventore reiciendis id nemo quo. Voluptatibus rerum fugit explicabo hic aperiam. Veritatis quos aut vero eum omnis"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               className="border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4D2D61] text-gray-700 resize-none h-25"
//             />
//           </div>

//           {/* Done Button */}
//           <div className="flex justify-end">
//             <button
//               type="submit"
//               className="bg-[#4D2D61] text-white py-2 px-6 rounded-xl hover:brightness-90 font-semibold"
//             >
//               Done
//             </button>
//           </div>
//         </form>

//         {/* Close Button (optional) */}
//         <button
//           onClick={onClose}
//           className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
//         >
//           ×
//         </button>
//       </div>
//     </div>
//   );
// };

// export default AddBoardPopup;
import { useState, useEffect } from "react";
import api from "../api";

const AddBoardPopup = ({ onClose, workspaceId, fetchBoardsAgain }) => {
  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debugging: Verify workspaceId is received
  useEffect(() => {
    console.log("AddBoardPopup mounted with workspaceId:", workspaceId);
  }, [workspaceId]);

  const handleBackdropClick = (e) => {
    if (e.target.id === "popup-backdrop") {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      // const response = await api.post(
      //   `/api/v1/boards/workspace/${workspaceId}/boards`,
      //   {
      //     name: boardName,
      //     description: description.trim() || undefined,
      //   }
      // );
      const response = await api.post(
        `/api/v1/boards`,
        {
          workspaceId: workspaceId, // pass workspaceId here
          name: boardName,
          description: description.trim() || undefined,
        }
      );

      console.log("Board created:", response.data);
      
      // Refresh parent component's board list
      if (fetchBoardsAgain) {
        fetchBoardsAgain();
      }
      
      onClose();
    } catch (err) {
      console.error("Board creation error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to create board. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="popup-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center font-[Nunito]"
    >
      <div className="bg-white p-5 rounded-2xl shadow-lg relative w-[570px]">
        <h2 className="text-3xl font-bold text-[#3E2C41] mb-4">Add Board</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold text-gray-900">
              Board name
            </label>
            <input
              type="text"
              placeholder="Web Design"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4D2D61] text-gray-700"
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold text-gray-900">
              Description
            </label>
            <textarea
              placeholder="Enter board description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4D2D61] text-gray-700 resize-none h-32"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#4D2D61] text-white py-2 px-6 rounded-xl hover:brightness-90 font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Board"}
            </button>
          </div>
        </form>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          disabled={loading}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AddBoardPopup;