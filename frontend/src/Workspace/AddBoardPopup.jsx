
import  { useState } from "react";

const AddBoardPopup = ({ onClose }) => {
  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");

  const handleBackdropClick = (e) => {
    if (e.target.id === "popup-backdrop") {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Board Name:", boardName);
    console.log("Description:", description);
    onClose();
  };

  return (
    <div
      id="popup-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center font-[Nunito]"
    >
      <div className="bg-white p-5 rounded-2xl shadow-lg relative w-[570px]">
        {/* Title */}
        <h2 className="text-3xl font-bold text-[#3E2C41] mb-4">
          Add Board
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Board Name */}
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
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold text-gray-900">
              Description
            </label>
            <textarea
              placeholder="A inventore reiciendis id nemo quo. Voluptatibus rerum fugit explicabo hic aperiam. Veritatis quos aut vero eum omnis"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4D2D61] text-gray-700 resize-none h-25"
            />
          </div>

          {/* Done Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#4D2D61] text-white py-2 px-6 rounded-xl hover:brightness-90 font-semibold"
            >
              Done
            </button>
          </div>
        </form>

        {/* Close Button (optional) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AddBoardPopup;

