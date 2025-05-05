
import { useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

const BASE_URL = "http://localhost:3000"; // Update if needed

const AddList = ({ boardId, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb"); // default blue
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/v1/lists', {
        name: name,
        board: boardId
      }, {
        withCredentials: true
      });
      window.location.reload();
      onSuccess(res.data); // refresh board or lists
      onClose(); // close modal
    } catch (err) {
      console.error("Error adding list", err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-[1px] z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-[280px] relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500">
          <X />
        </button>

        <h2 className="text-2xl font-semibold mb-4">Add list</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
            required
          />

          <div className="flex items-center gap-3">
            <label className="text-lg font-semibold">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-20 h-8 rounded border"
            />
          </div>

         
            <button
               type="submit"
                disabled={loading}
               className="bg-[#4D2D61] text-white px-5 py-2 rounded-lg float-right"
                >
              {loading ? "Adding..." : "Add"}
             </button>

        </form>
      </div>
    </div>
  );
};

export default AddList;
