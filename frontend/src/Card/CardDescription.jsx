import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateDescription } from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardDescription({ cardId }) {
  const dispatch = useDispatch();
  const { description } = useSelector((state) => state.cardDetails);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    dispatch(updateDescription(e.target.value));
  };

  return (
    <div className="mt-4 w-full">
      {/* عنوان الوصف */}
      <div className="flex items-center text-gray-500 mb-2">
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 6h13M8 12h9m-9 6h13"
          />
        </svg>
        <span className="text-gray-500">Description</span>
      </div>

      <textarea
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4D2D61] focus:border-2 resize-y min-h-[60px]"
        rows={4}
        placeholder="Add notes, links or any details about this card"
        value={description || ""}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
}
