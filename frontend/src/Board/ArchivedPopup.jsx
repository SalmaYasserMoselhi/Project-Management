

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import axios from "axios";

const BASE_URL = "http://localhost:3000";

const ArchivedPopup = ({ onClose, boardId , onListRestored  }) => {
  const popupRef = useRef(null);
  const dropdownRef = useRef(null);

  const [activeTab, setActiveTab] = useState("Card");
  const [archivedLists, setArchivedLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isVisible, setIsVisible] = useState(true); // for animation

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsidePopup =
        popupRef.current && !popupRef.current.contains(event.target);
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(event.target);

      if (clickedOutsidePopup) {
        setIsVisible(false); // trigger animation
        setTimeout(onClose, 200); // wait for animation
      }

      // Only close dropdown if it's open and clicked outside
      if (
        openDropdownId &&
        clickedOutsideDropdown &&
        !event.target.closest("svg")
      ) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, openDropdownId]);

  useEffect(() => {
    if (activeTab === "List") {
      fetchArchivedLists();
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

  // const handleRestore = async (listId) => {
  //   try {
  //     await axios.patch(
  //       `${BASE_URL}/api/v1/lists/${listId}/restore`,
  //       {},
  //       { withCredentials: true }
  //     );
  //     fetchArchivedLists();
  //      if (res?.data?.data) {
  //     onListRestored?.(res.data.data); // pass restored list
  //   }
  //   } catch (error) {
  //     console.error("Failed to restore list:", error);
  //   }
  // };


const handleRestore = async (listId) => {
  try {
    const res = await axios.patch(
      `${BASE_URL}/api/v1/lists/${listId}/restore`,
      {},
      { withCredentials: true }
    );

    // Remove restored list from the archive list state
    setArchivedLists((prev) => prev.filter((l) => l._id !== listId));

    // Inform parent about restored list
    if (res?.data?.data) {
      onListRestored?.(res.data.data); // ✅ safe optional chaining
    }
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
        setArchivedLists((prev) =>
          prev.filter((list) => list._id !== listId)
        );
        setOpenDropdownId(null);
      } else {
        console.warn("Unexpected response:", res);
      }
    } catch (error) {
      console.error("Error deleting list:", error);
      alert("Failed to delete list.");
    }
  };

  const Dropdown = ({ listId }) => (
    <div
      ref={dropdownRef}
      className="absolute right-2 top-9 w-32 bg-white border border-gray-200 rounded shadow z-50"
    >
      <button
        onClick={() => {
          handleRestore(listId);
          setOpenDropdownId(null);
        }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
      >
        Unarchive
      </button>
      <button
        onClick={() => handleDeleteList(listId)}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
      >
        Delete
      </button>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center text-gray-400 py-10">Loading...</div>
      );
    }
    if (error) {
      return <div className="text-center text-red-400 py-10">{error}</div>;
    }

    const items = activeTab === "List" ? archivedLists : [];

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
            <div className="font-medium text-gray-800">{item.name}</div>
            <div className="text-sm text-gray-500">{activeTab}</div>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 18 24"
            onClick={() =>
              setOpenDropdownId((prev) =>
                prev === item._id ? null : item._id
              )
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

          {openDropdownId === item._id && <Dropdown listId={item._id} />}
        </div>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/10  flex justify-end items-start">
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
