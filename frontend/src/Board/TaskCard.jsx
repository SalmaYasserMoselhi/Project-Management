// taskCARD

import drag from "../assets/drag-icon.png";
import avatar3 from "../assets/Avatar3.png";
import addButton from "../assets/Add Button.png";
import List from "../assets/prime_list.png";
import File from "../assets/file_present.png";
import third from "../assets/third.png";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import CardDetails from "../Card/CardDetails";

// Array of background colors for avatars
const avatarColors = [
  "#4D2D61", // Primary brand color
  "#7b4397", // Secondary brand color
  "#3498db", // Blue
  "#2ecc71", // Green
  "#e74c3c", // Red
  "#f39c12", // Orange
  "#9b59b6", // Purple
  "#1abc9c", // Teal
  "#34495e", // Dark blue
];

// Helper function to get avatar URL or generate one
const getUserAvatar = (user) => {
  // Check for actual avatar URL with multiple possible property names
  if (user.avatar && user.avatar !== "null" && user.avatar !== "undefined") {
    return user.avatar;
  }

  // For board members, the avatar might be nested in a different way
  if (
    user.user &&
    user.user.avatar &&
    user.user.avatar !== "null" &&
    user.user.avatar !== "undefined"
  ) {
    return user.user.avatar;
  }

  // Generate initials for the avatar
  let initials;
  let firstName = user.firstName || (user.user && user.user.firstName);
  let lastName = user.lastName || (user.user && user.user.lastName);
  let username = user.username || (user.user && user.user.username);
  let email = user.email || (user.user && user.user.email);

  if (firstName && lastName) {
    initials = `${firstName[0]}${lastName[0]}`;
  } else if (username) {
    initials = username.substring(0, 2).toUpperCase();
  } else if (email) {
    initials = email.substring(0, 2).toUpperCase();
  } else {
    initials = "UN";
  }

  // Generate a consistent color based on the user ID or name
  const userId = user._id || (user.user && user.user._id) || "";
  const userEmail = email || "";
  const colorIndex =
    (userId.toString().charCodeAt(0) || userEmail.charCodeAt(0) || 0) %
    avatarColors.length;
  const bgColor = avatarColors[colorIndex];

  return `https://ui-avatars.com/api/?name=${initials}&background=${bgColor.replace(
    "#",
    ""
  )}&color=fff&bold=true&size=128`;
};

// Local cache for member data
const membersCache = new Map();

const TaskCard = ({
  id,
  title,
  priority,
  fileCount = 0,
  commentCount = 0,
  boardId,
  allLists,
  listId,
  labels = [],
  onCardUpdate,
  members: initialMembers = [], // Optional prop for initial members
}) => {
  const [isCardDetailsOpen, setIsCardDetailsOpen] = useState(false);
  const [actualFileCount, setActualFileCount] = useState(fileCount);
  const [actualCommentCount, setActualCommentCount] = useState(commentCount);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const dropdownRef = useRef(null);

  const BASE_URL = "http://localhost:3000";

  const MAX_VISIBLE_LABELS = 2;

  useEffect(() => {
    if (id && !id.startsWith("temp-")) {
      const fetchCardCounts = async () => {
        try {
          // Fetch attachments
          const attachmentsResponse = await axios.get(
            `${BASE_URL}/api/v1/cards/${id}`
          );
          if (attachmentsResponse.data?.data?.attachments) {
            setActualFileCount(
              attachmentsResponse.data.data.attachments.length
            );
          }

          // Fetch comments
          const commentsResponse = await axios.get(
            `${BASE_URL}/api/v1/cards/${id}/comments`
          );
          if (commentsResponse.data?.data?.comments) {
            const totalComments = commentsResponse.data.data.comments.reduce(
              (acc, comment) => acc + 1 + (comment.replies?.length || 0),
              0
            );
            setActualCommentCount(totalComments);
          }
        } catch (err) {
          console.error("Error fetching card counts:", err);
        }
      };

      const fetchMembers = async () => {
        // Check cache first
        if (membersCache.has(id)) {
          const cachedMembers = membersCache.get(id);
          console.log(`Using cached members for card ${id}:`, cachedMembers);
          setMembers(cachedMembers);
          return;
        }

        // Skip API call if initialMembers is provided
        if (initialMembers.length > 0) {
          console.log(`Using initial members for card ${id}:`, initialMembers);
          setMembers(initialMembers);
          membersCache.set(id, initialMembers);
          return;
        }

        setIsLoadingMembers(true);
        try {
          const response = await axios.get(
            `${BASE_URL}/api/v1/cards/${id}/members`,
            {
              withCredentials: true,
            }
          );
          console.log(`Members API response for card ${id}:`, response.data);
          const membersData = response.data?.data?.members || [];
          console.log(`Processed members data for card ${id}:`, membersData);
          if (Array.isArray(membersData) && membersData.length > 0) {
            console.log(
              `Successfully fetched ${membersData.length} members for card ${id}:`,
              membersData
            );
            setMembers(membersData);
            membersCache.set(id, membersData);
          } else if (Array.isArray(membersData)) {
            console.log(`No members found for card ${id}`);
            setMembers([]);
            membersCache.set(id, []);
          }
        } catch (err) {
          console.error(`Error fetching members for card ${id}:`, err);
          setMembers([]);
          membersCache.set(id, []);
        } finally {
          setIsLoadingMembers(false);
        }
      };

      fetchCardCounts();
      fetchMembers();
    } else {
      setActualFileCount(fileCount);
      setActualCommentCount(commentCount);
      setMembers(initialMembers);
      setIsLoadingMembers(false);
    }
  }, [id, fileCount, commentCount, initialMembers]);

  const priorityColors = {
    high: { color: "#DC2626", bg: "#FFECEC" },
    medium: { color: "#F59E0B", bg: "#FFF6E6" },
    low: { color: "#16A34A", bg: "#E7F7EC" },
    none: { color: "#9CA3AF", bg: "#F3F4F6" },
  };

  const normalizedPriority = (priority || "medium").toLowerCase();
  const priorityStyle =
    priorityColors[normalizedPriority] || priorityColors.medium;

  const handleCardClick = (e) => {
    if (e.target.closest(".dropdown-button")) return;
    setIsCardDetailsOpen(true);
  };

  const handleCardClose = () => setIsCardDetailsOpen(false);

  const handleCardSaved = (originalListId, newListId) => {
    if (onCardUpdate) {
      if (originalListId && newListId && originalListId !== newListId) {
        onCardUpdate(originalListId, newListId);
      } else {
        onCardUpdate();
      }
    }
  };

  const handleArchiveCard = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/cards/${id}/archive`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (response.ok && result.status === "success") {
        setIsDropdownOpen(false);
        onCardUpdate?.();
      }
    } catch (error) {
      console.error(`Error archiving card ${id}:`, error);
    }
  };

  const handleDeleteCard = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/cards/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setIsDropdownOpen(false);
        onCardUpdate?.();
      }
    } catch (error) {
      console.error(`Error deleting card ${id}:`, error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData("cardId", id);
    e.dataTransfer.setData("sourceListId", listId);
    e.dataTransfer.setData("cardTitle", title || "Untitled");
    e.dataTransfer.setData("type", "card");
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
  };

  return (
    <>
      <div
        className="flex rounded-lg overflow-hidden shadow-lg mb-3 w-full cursor-pointer task-card"
        onClick={handleCardClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="w-8 bg-[#4D2D61] flex items-center justify-center"
          style={{ minHeight: "100px" }}
        >
          <img src={drag} className="w-5 h-8 text-white" alt="Drag" />
        </div>

        <div className="bg-white text-black p-3 rounded-r-lg flex-grow w-full">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold mt-1 mb-3 truncate">
              {title || "Untitled"}
            </h4>

            <div className="relative dropdown-button" ref={dropdownRef}>
              <svg
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="cursor-pointer"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 18 24"
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

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded-lg shadow-md z-10">
                  <button
                    onClick={handleArchiveCard}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-800"
                  >
                    Archive
                  </button>
                  <button
                    onClick={handleDeleteCard}
                    className="w-full text-left px-4 py-2 hover:bg-red-100 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-2 py-1 text-xs font-medium rounded-lg"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.color,
              }}
            >
              {normalizedPriority.charAt(0).toUpperCase() +
                normalizedPriority.slice(1)}
            </span>

            {labels.length > 0 && (
              <>
                {labels.slice(0, MAX_VISIBLE_LABELS).map((label, index) => (
                  <span
                    key={label.id || index}
                    className="px-2 py-1 text-xs font-medium rounded-lg"
                    style={{
                      backgroundColor: `${label.color}33`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}

                {labels.length > MAX_VISIBLE_LABELS && (
                  <span className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
                    +{labels.length - MAX_VISIBLE_LABELS}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex -space-x-2 items-center">
              {isLoadingMembers ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              ) : members.length > 0 ? (
                <>
                  <img
                    src={getUserAvatar(members[0].user || members[0])}
                    className="w-8 h-8 rounded-full border-2 border-white"
                    alt={`Member ${
                      members[0].user?.firstName ||
                      members[0].firstName ||
                      "Unknown"
                    }`}
                    title={
                      members[0].user?.firstName ||
                      members[0].firstName ||
                      "Unknown"
                    }
                  />
                  {members.length > 1 && (
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-bold text-[#606C80]">
                      +{members.length - 1}
                    </span>
                  )}
                </>
              ) : null}
              <img
                src={addButton}
                alt="Add member"
                className="w-8 h-8 ms-4 rounded-full border-2 border-white bg-gray-300 cursor-pointer"
              />
            </div>

            <div className="flex gap-2 ml-4 items-center">
              <img
                src={List}
                className="w-6 h-6 cursor-pointer hover:opacity-70"
                alt="Checklist"
              />
              <div className="flex items-center gap-0">
                <img
                  src={File}
                  className="w-5 h-5 cursor-pointer hover:opacity-70"
                  alt="Files"
                />
                <span className="text-sm text-gray-600 font-bold mt-1">
                  {actualFileCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <img
                  src={third}
                  className="w-5 h-5 cursor-pointer hover:opacity-70 mt-1"
                  alt="Comments"
                />
                <span className="text-sm text-gray-600 font-bold mt-1">
                  {actualCommentCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCardDetailsOpen && (
        <CardDetails
          cardId={id}
          currentListId={listId}
          boardId={boardId}
          allLists={allLists}
          onClose={handleCardClose}
          onCardSaved={handleCardSaved}
        />
      )}
    </>
  );
};

export default TaskCard;
