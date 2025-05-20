


import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import axios from "axios";

const BASE_URL = "http://localhost:3000";

const ArchivedPopup = ({ onClose, boardId, onListRestored, onCardRestored }) => {
  const popupRef = useRef(null);
  const dropdownRef = useRef(null);

  const [activeTab, setActiveTab] = useState("Card");
  const [archivedLists, setArchivedLists] = useState([]);
  const [archivedCards, setArchivedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  // Handle clicks outside popup and dropdown to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsidePopup =
        popupRef.current && !popupRef.current.contains(event.target);
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(event.target);

      if (clickedOutsidePopup) {
        setIsVisible(false);
        setTimeout(onClose, 200);
      }

      if (openDropdownId && clickedOutsideDropdown && !event.target.closest("svg")) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, openDropdownId]);

  // Fetch archived data based on active tab
  useEffect(() => {
    if (activeTab === "List") {
      fetchArchivedLists();
    } else {
      fetchArchivedCards();
    }
  }, [activeTab]);

  const fetchArchivedLists = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/api/v1/lists/board/${boardId}/lists/archived`,
        { withCredentials: true }
      );

      const lists = Array.isArray(response.data.data)
        ? response.data.data
        : response.data.data?.lists || [];

      setArchivedLists(lists);
      setError("");
    } catch (err) {
      console.error("Failed to fetch archived lists:", err);
      setError("Failed to load archived lists");
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/api/v1/cards/board/${boardId}/archived`,
        { withCredentials: true }
      );

      const cards = Array.isArray(response.data.data.archivedCards)
        ? response.data.data.archivedCards
        : [];

      setArchivedCards(cards);
      setError("");
    } catch (err) {
      console.error("Failed to fetch archived cards:", err);
      setError("Failed to load archived cards");
    } finally {
      setLoading(false);
    }
  };

  // Restore and delete handlers for lists
  const handleRestoreList = async (listId) => {
    try {
      const res = await axios.patch(
        `${BASE_URL}/api/v1/lists/${listId}/restore`,
        {},
        { withCredentials: true }
      );

      setArchivedLists((prev) => prev.filter((l) => l._id !== listId));
      if (res?.data?.data) onListRestored?.(res.data.data);
    } catch (error) {
      console.error("Failed to restore list:", error);
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/v1/lists/${listId}`, {
        withCredentials: true,
      });

      if (res.status === 200 || res.status === 204) {
        setArchivedLists((prev) => prev.filter((list) => list._id !== listId));
        setOpenDropdownId(null);
      }
    } catch (error) {
      console.error("Error deleting list:", error);
      alert("Failed to delete list.");
    }
  };

  // Restore and delete handlers for cards
  const handleRestoreCard = async (cardId) => {
    try {
      const res = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/restore`,
        {},
        { withCredentials: true }
      );

      setArchivedCards((prev) => prev.filter((c) => c._id !== cardId));
      if (res?.data?.data) onCardRestored?.(res.data.data);
    } catch (error) {
      console.error("Failed to restore card:", error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/v1/cards/${cardId}`, {
        withCredentials: true,
      });

      if (res.status === 200 || res.status === 204) {
        setArchivedCards((prev) => prev.filter((c) => c._id !== cardId));
        setOpenDropdownId(null);
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      alert("Failed to delete card.");
    }
  };

  // Render list or card items
  const renderContent = () => {
    if (loading) {
      return <div className="text-center text-gray-400 py-10">Loading...</div>;
    }
    if (error) {
      return <div className="text-center text-red-400 py-10">{error}</div>;
    }

    const items =
      activeTab === "List"
        ? Array.isArray(archivedLists)
          ? archivedLists
          : []
        : Array.isArray(archivedCards)
        ? archivedCards
        : [];

    if (items.length === 0) {
      return (
        <div className="text-center text-gray-400 py-10">
          No {activeTab.toLowerCase()}s found.
        </div>
      );
    }

    return items.map((item) => (
      <div
        key={item._id}
        className="relative w-full max-w-[360px] mx-auto border border-gray-200 rounded-lg p-4 hover:bg-[#F7F1FA] transition shadow-sm"
      >
        <div className="flex justify-between items-center">
          <div>
            {/* <div className="font-medium text-gray-800">{item.name}</div>
             */}
             <div className="font-medium text-gray-800">
               {activeTab === "List" ? item.name : item.title}
               </div>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 18 24"
            onClick={() =>
              setOpenDropdownId((prev) => (prev === item._id ? null : item._id))
            }
            className="cursor-pointer"
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

          {openDropdownId === item._id && (
            <div
              ref={dropdownRef}
              className="absolute right-2 top-9 w-32 bg-white border border-gray-200 rounded shadow z-50"
            >
              <button
                onClick={() => {
                  activeTab === "List"
                    ? handleRestoreList(item._id)
                    : handleRestoreCard(item._id);
                  setOpenDropdownId(null);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Unarchive
              </button>
              <button
                onClick={() =>
                  activeTab === "List"
                    ? handleDeleteList(item._id)
                    : handleDeleteCard(item._id)
                }
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/10 flex justify-end items-start">
      <div
        ref={popupRef}
        className={`bg-white w-[330px] h-screen overflow-hidden shadow-2xl rounded-none transform transition-all duration-200 ease-in-out ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Archived Items</h2>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 200);
            }}
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
          </button>
        </div>

        <div className="flex gap-3 px-4 pt-4">
          {["Card", "List"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition w-[155px] ${
                activeTab === tab
                  ? "bg-[#4D2D61] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto h-[calc(100vh-120px)] p-4 space-y-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ArchivedPopup;
