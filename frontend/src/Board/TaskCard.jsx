import addButton from "../assets/Add Button.png";
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
  containerRef,
  scrollToMe,
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

  useEffect(() => {
    if (scrollToMe && containerRef && containerRef.current) {
      const cardElement = document.getElementById(`card-${id}`);
      if (cardElement) {
        const container = containerRef.current;
        const cardRect = cardElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offset =
          cardRect.top -
          containerRect.top -
          container.clientHeight / 2 +
          cardRect.height / 2;
        container.scrollBy({ top: offset, behavior: "smooth" });
        setTimeout(() => {
          cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 350);
      }
    }
  }, [scrollToMe, containerRef, id]);

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
        id={`card-${id}`}
        className="flex rounded-lg overflow-hidden shadow-sm mb-3 w-full cursor-pointer task-card button-hover"
        onClick={handleCardClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="w-8 bg-[#4D2D61] flex items-center justify-center"
          style={{ minHeight: "100px" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="32"
            viewBox="0 0 16 16"
          >
            <path
              fill="#f7f7f7"
              d="M5 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C5.79 3 5.86 3 6 3s.209 0 .267.008a.85.85 0 0 1 .725.725C7 3.79 7 3.86 7 4s0 .209-.008.267a.85.85 0 0 1-.725.725C6.21 5 6.14 5 6 5s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C5 4.21 5 4.14 5 4m0 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C5.79 7 5.86 7 6 7s.209 0 .267.008a.85.85 0 0 1 .725.725C7 7.79 7 7.86 7 8s0 .209-.008.267a.85.85 0 0 1-.725.725C6.21 9 6.14 9 6 9s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C5 8.21 5 8.14 5 8m0 4c0-.139 0-.209.008-.267a.85.85 0 0 1 .724-.724c.059-.008.128-.008.267-.008s.21 0 .267.008a.85.85 0 0 1 .724.724c.008.058.008.128.008.267s0 .209-.008.267a.85.85 0 0 1-.724.724c-.058.008-.128.008-.267.008s-.209 0-.267-.008a.85.85 0 0 1-.724-.724C5 12.209 5 12.139 5 12m4-8c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C9.79 3 9.86 3 10 3s.209 0 .267.008a.85.85 0 0 1 .725.725C11 3.79 11 3.86 11 4s0 .209-.008.267a.85.85 0 0 1-.725.725C10.21 5 10.14 5 10 5s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C9 4.21 9 4.14 9 4m0 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C9.79 7 9.86 7 10 7s.209 0 .267.008a.85.85 0 0 1 .725.725C11 7.79 11 7.86 11 8s0 .209-.008.267a.85.85 0 0 1-.725.725C10.21 9 10.14 9 10 9s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C9 8.21 9 8.14 9 8m0 4c0-.139 0-.209.008-.267a.85.85 0 0 1 .724-.724c.059-.008.128-.008.267-.008c.14 0 .21 0 .267.008a.85.85 0 0 1 .724.724c.008.058.008.128.008.267s0 .209-.008.267a.85.85 0 0 1-.724.724c-.058.008-.128.008-.267.008s-.209 0-.267-.008a.85.85 0 0 1-.724-.724C9 12.209 9 12.139 9 12"
            />
          </svg>
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
              className="px-2 py-1 text-xs font-extrabold rounded-lg"
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
                    className="px-2 py-1 text-xs font-extrabold rounded-lg"
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
            </div>

            <div className="flex gap-2 ml-4 items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#dadee5"
                  d="M19 12.75H8a.75.75 0 0 1 0-1.5h11a.75.75 0 0 1 0 1.5m0-4.5H8a.75.75 0 0 1 0-1.5h11a.75.75 0 0 1 0 1.5m0 9H8a.75.75 0 0 1 0-1.5h11a.75.75 0 0 1 0 1.5M5 8.5a1 1 0 0 1-.38-.07a1.5 1.5 0 0 1-.33-.22A1 1 0 0 1 4 7.5a1.05 1.05 0 0 1 .29-.71a.9.9 0 0 1 .33-.21a1 1 0 0 1 .76 0a1 1 0 0 1 .33.21A1.05 1.05 0 0 1 6 7.5a1 1 0 0 1-.29.71a1.5 1.5 0 0 1-.33.22A1 1 0 0 1 5 8.5M5 13a1 1 0 0 1-.38-.08a1.2 1.2 0 0 1-.33-.21A1 1 0 0 1 4 12a1.05 1.05 0 0 1 .29-.71a1.2 1.2 0 0 1 .33-.21A1 1 0 0 1 5.2 11l.18.06l.18.09a2 2 0 0 1 .15.12A1.05 1.05 0 0 1 6 12a1 1 0 0 1-1 1m0 4.5a1 1 0 0 1-.38-.07a1.5 1.5 0 0 1-.33-.22a1.2 1.2 0 0 1-.21-.33a.94.94 0 0 1 0-.76a1.2 1.2 0 0 1 .21-.33a1 1 0 0 1 1.09-.21a1 1 0 0 1 .33.21a1.2 1.2 0 0 1 .21.33a.94.94 0 0 1 0 .76a1.2 1.2 0 0 1-.21.33a1 1 0 0 1-.71.29"
                />
              </svg>
              <div className="flex items-center gap-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 20"
                >
                  <path
                    fill="#dadee5"
                    d="M13.17 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8.83c0-.53-.21-1.04-.59-1.41l-4.83-4.83c-.37-.38-.88-.59-1.41-.59M16 15c0 2.34-2.01 4.21-4.39 3.98C9.53 18.78 8 16.92 8 14.83V9.64c0-1.31.94-2.5 2.24-2.63A2.5 2.5 0 0 1 13 9.5V14c0 .55-.45 1-1 1s-1-.45-1-1V9.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5v5.39c0 1 .68 1.92 1.66 2.08A2 2 0 0 0 14 15v-3c0-.55.45-1 1-1s1 .45 1 1zm-2-8V4l4 4h-3c-.55 0-1-.45-1-1"
                  />
                </svg>
                <span className="text-sm text-[#98A2B2] font-bold mt-1">
                  {actualFileCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 20"
                >
                  <path
                    fill="#dadee5"
                    d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-3 12H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1m0-3H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1m0-3H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1"
                  />
                </svg>
                <span className="text-sm text-[#98A2B2] font-bold mt-1">
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
