
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const ArchivedPopup = ({ onClose }) => {
  const popupRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Card");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const mockItems = [
    { id: 1, type: "List", name: "Frontend Tasks" },
    { id: 2, type: "Card", name: "Fix Navbar" },
    { id: 3, type: "Card", name: "Improve Footer" },
    { id: 4, type: "List", name: "Backend Refactor" },
  ];

  const filteredItems = mockItems.filter((item) => item.type === activeTab);

  return (
    <div className="fixed inset-0 z-50 bg-opacity-15 backdrop-blur-sm flex justify-end items-start">
      <div
        ref={popupRef}
        className="bg-white w-[400px] h-screen overflow-hidden shadow-2xl rounded-none"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Archived Items</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 px-4 pt-4">
          {["Card", "List"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition w-[100px] ${
                activeTab === tab
                  ? "bg-[#4D2D61] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(100vh-120px)] p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              No {activeTab.toLowerCase()}s found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-[#F7F1FA] transition cursor-pointer shadow-sm"
              >
                <div className="font-medium text-gray-800">{item.name}</div>
                <div className="text-sm text-gray-500">{item.type}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivedPopup;

