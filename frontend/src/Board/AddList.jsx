import { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

const BASE_URL = "http://localhost:3000"; // Update if needed

const AddList = ({
  boardId,
  onClose,
  onSuccess,
  isEditing = false,
  currentListName = "",
  listId = null,
}) => {
  const [name, setName] = useState(isEditing ? currentListName : "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing && listId) {
        // Update existing list
        const res = await axios.patch(
          `${BASE_URL}/api/v1/lists/${listId}`,
          {
            name: name,
          },
          {
            withCredentials: true,
          }
        );
        onSuccess(res.data.data.list); // Pass the updated list data
        onClose(); // close modal
      } else {
        // Create new list
        const res = await axios.post(
          `${BASE_URL}/api/v1/lists`,
          {
            name: name,
            board: boardId,
          },
          {
            withCredentials: true,
          }
        );
        window.location.reload();
        onSuccess(res.data); // refresh board or lists
        onClose(); // close modal
      }
    } catch (err) {
      console.error("Error adding/editing list", err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-[1px] z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-[280px] relative max-w-[300px]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:scale-110 transform"
        >
          <X />
        </button>

        <h2 className="text-2xl font-semibold mb-4">
          {isEditing ? "Edit list" : "Add list"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#4d2d61]"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white px-5 py-2 rounded-lg float-right button-hover"
          >
            {loading
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
              ? "Update"
              : "Add"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddList;
