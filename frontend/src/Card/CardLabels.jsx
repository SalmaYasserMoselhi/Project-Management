import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SketchPicker } from "react-color";
import {
  addLabel,
  updateLabel,
  removeLabel,
} from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardLabels({ cardId }) {
  const dispatch = useDispatch();
  const labels = useSelector((state) => state.cardDetails.labels);
  const {
    id: storedCardId,
    saveLoading,
    saveError,
  } = useSelector((state) => state.cardDetails);
  const [isOpen, setIsOpen] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3498db");
  const [editingLabel, setEditingLabel] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [error, setError] = useState(null);

  const pickerRef = useRef(null);
  const popupRef = useRef(null);
  const colorButtonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(event.target)
      ) {
        setShowColorPicker(false);
      }
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
        setEditingLabel(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddOrUpdateLabel = () => {
    if (labelName.trim()) {
      setError(null);

      // Prepare the label data
      const labelData = {
        name: labelName,
        color: selectedColor,
      };

      try {
        if (editingLabel) {
          // Update existing label locally
          dispatch(
            updateLabel({
              index: labels.findIndex((l) => l === editingLabel),
              name: labelName,
              color: selectedColor,
            })
          );
        } else {
          // Add new label locally
          dispatch(addLabel(labelData));
        }

        // Close popup and reset form
        setLabelName("");
        setIsOpen(false);
        setShowColorPicker(false);
        setEditingLabel(null);
      } catch (err) {
        console.error("Error handling label:", err);
        setError("Failed to save label");
      }
    }
  };

  const handleEditLabel = (label) => {
    setLabelName(label.name);
    setSelectedColor(label.color);
    setEditingLabel(label);
    setIsOpen(true);
  };

  const handleRemoveLabel = (index) => {
    dispatch(removeLabel(index));
    setIsOpen(false);
  };

  return (
    <div className="flex flex-row items-center mt-4 w-full max-[320px]:flex-col max-[320px]:items-start">
      <div className="w-30 text-gray-500 flex items-center">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16.52 7H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10.52a1 1 0 0 0 .78-.375L21 12l-3.7-4.625A1 1 0 0 0 16.52 7"
          />
        </svg>
        Labels
      </div>

      <div className="flex items-center max-[320px]:ml-4 max-[320px]:mt-2 max-[320px]:w-full">
        <div className="flex flex-wrap gap-1 mr-1">
          {labels.map((label, index) => (
            <span
              key={label.id || index}
              className="px-3 py-1 rounded-md text-xs font-semibold cursor-pointer"
              style={{
                color: label.color,
                backgroundColor: `${label.color}33`,
              }}
              onClick={() => handleEditLabel(label)}
            >
              {label.name}
            </span>
          ))}
        </div>

        <button
          className="w-6 h-6 flex items-center justify-center rounded-md text-lg font-bold transition-all cursor-pointer ml-1"
          style={{ backgroundColor: "#DCCDE6", color: "#4D2D61" }}
          onClick={() => {
            setEditingLabel(null);
            setLabelName("");
            setSelectedColor("#3498db");
            setIsOpen(true);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 22 22">
            <path fill="currentColor" d="M12 17h-2v-5H5v-2h5V5h2v5h5v2h-5Z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div
            ref={popupRef}
            className="bg-white p-4 rounded-lg shadow-lg w-64 max-w-[90%] relative"
          >
            <button
              className="absolute top-0 right-2 text-gray-500 hover:text-gray-700 text-2xl transition cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                setEditingLabel(null);
                setLabelName("");
              }}
            >
              &times;
            </button>

            <input
              type="text"
              placeholder="Label name"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className="w-full text-lg border-none focus:ring-0 focus:outline-none"
            />

            <div className="flex items-center gap-2 mb-3 mt-2">
              <span className="text-gray-500">Color:</span>
              <div className="relative">
                <div
                  ref={colorButtonRef}
                  className="w-10 h-5 rounded-md cursor-pointer"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div
                    ref={pickerRef}
                    className="absolute left-0 sm:left-full top-0 sm:ml-2 z-50"
                  >
                    <SketchPicker
                      color={selectedColor}
                      onChange={(color) => setSelectedColor(color.hex)}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

            <div className="flex justify-evenly gap-2">
              {editingLabel && (
                <button
                  onClick={() =>
                    handleRemoveLabel(
                      labels.findIndex((l) => l === editingLabel)
                    )
                  }
                  className="py-1 w-full bg-gray-300 text-red-600 rounded-md cursor-pointer"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleAddOrUpdateLabel}
                className="py-1 w-full bg-[#4D2D61] text-white rounded-md cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
