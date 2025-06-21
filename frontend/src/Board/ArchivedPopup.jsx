"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, MoreVertical } from "lucide-react";
import axios from "axios";
import {
  usePopupAnimation,
  setupArchivedPopupAnimation,
} from "../utils/popup-animations";

const BASE_URL = "http://localhost:3000";

const ArchivedPopup = ({
  onClose,
  boardId,
  onListRestored,
  onCardRestored,
}) => {
  const popupRef = useRef(null);
  const backdropRef = useRef(null);
  const dropdownRef = useRef(null);

  const [activeTab, setActiveTab] = useState("Card");
  const [archivedLists, setArchivedLists] = useState([]);
  const [archivedCards, setArchivedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [transitionState, setTransitionState] = useState("opening");

  // Use the standardized popup animation
  usePopupAnimation();

  // Handle animation end events for proper state transitions
  const handleAnimationEnd = useCallback(
    (currentTransitionState) => {
      if (currentTransitionState === "opening") {
        setTransitionState("open");
      } else if (currentTransitionState === "closing") {
        onClose();
      }
    },
    [onClose]
  );

  // Handle closing the archived popup
  const handleClose = useCallback(() => {
    if (transitionState === "open") {
      setTransitionState("closing");
    }
  }, [transitionState]);

  // Setup animation based on transition state
  useEffect(() => {
    return setupArchivedPopupAnimation(
      popupRef,
      backdropRef,
      transitionState,
      handleAnimationEnd
    );
  }, [transitionState, handleAnimationEnd]);

  // Handle clicks outside popup and dropdown to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsidePopup =
        popupRef.current && !popupRef.current.contains(event.target);
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(event.target);

      if (clickedOutsidePopup) {
        handleClose();
      }

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
  }, [openDropdownId, handleClose]);

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
        {
          withCredentials: true,
        }
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

  // Get current items based on active tab
  const getCurrentItems = () => {
    return activeTab === "List"
      ? Array.isArray(archivedLists)
        ? archivedLists
        : []
      : Array.isArray(archivedCards)
      ? archivedCards
      : [];
  };

  useEffect(() => {
    const header = document.querySelector("header");
    if (popupRef.current && header) {
      const headerHeight = header.offsetHeight;
      popupRef.current.style.top = `${headerHeight}px`;
      popupRef.current.style.height = `calc(100vh - ${headerHeight}px)`;
    }
    if (backdropRef.current && header) {
      const headerHeight = header.offsetHeight;
      backdropRef.current.style.top = `${headerHeight}px`;
      backdropRef.current.style.height = `calc(100vh - ${headerHeight}px)`;
    }
  }, []);

  const currentItems = getCurrentItems();

  return (
    <>
      {/* Backdrop - clicking here will close the archived popup */}
      <div
        ref={backdropRef}
        className="workspace-backdrop"
        onClick={handleClose}
      />

      {/* Archived Panel - positioned on the right with proper animation classes */}
      <div ref={popupRef} className="archived-popup">
        {/* Fixed Header */}
        <div className="p-4 space-y-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-[#4D2D61]">Archived Items</h1>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-[#4D2D61] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {["Card", "List"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-[#4D2D61] text-white"
                    : "text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Count Header */}
        <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">
            All {activeTab}s ({currentItems.length})
          </span>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center text-gray-500 my-5 p-4">
              <div className="animate-spin h-5 w-5 border-t-2 border-[#4D2D61] rounded-full mx-auto"></div>
              <p className="mt-2 text-sm">
                Loading {activeTab.toLowerCase()}s...
              </p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 my-5 p-4 text-sm">
              {error}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center text-gray-500 my-5 p-4 text-sm">
              No archived {activeTab.toLowerCase()}s found.
            </div>
          ) : (
            <div>
              {currentItems.map((item) => (
                <div
                  key={item._id}
                  className="relative flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group"
                >
                  <span className="flex-1 truncate text-sm font-medium text-[#4D2D61]">
                    {activeTab === "List" ? item.name : item.title}
                  </span>

                  <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        setOpenDropdownId((prev) =>
                          prev === item._id ? null : item._id
                        )
                      }
                      className="p-1 text-gray-400 hover:text-[#4D2D61]"
                    >
                      <MoreVertical className="h-[18px] w-[18px]" />
                    </button>

                    {openDropdownId === item._id && (
                      <div
                        ref={dropdownRef}
                        className="absolute right-0 top-8 z-50 w-32 rounded-lg border border-gray-200 bg-white shadow-lg"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              activeTab === "List"
                                ? handleRestoreList(item._id)
                                : handleRestoreCard(item._id);
                              setOpenDropdownId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => {
                              activeTab === "List"
                                ? handleDeleteList(item._id)
                                : handleDeleteCard(item._id);
                              setOpenDropdownId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ArchivedPopup;




