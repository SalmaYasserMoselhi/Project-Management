"use client";

import { useEffect, useRef, memo, useState, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import {
  addMessage,
  setIsTyping,
  fetchMessages,
  clearMessages,
  addUserToGroup,
  getAllUsers,
  removeUserFromGroup,
  leaveGroup,
} from "../features/Slice/ChatSlice/chatSlice";
import { onMessage, onTyping, onStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context";
import defaultAvatar from "../assets/defaultAvatar.png";
import { isValidImageUrl } from "../utils/imageUtils";
import { Plus, X, Trash } from "lucide-react";

const ChatContainer = () => {
  const dispatch = useDispatch();
  const { isTyping } = useSelector((state) => state.chat);
  const { currentUser, activeChat, setActiveConversation } = useChat();
  const allUsers = useSelector((state) => state.chat.users || []);
  const prevChatIdRef = useRef(null);
  const popupRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const [showPopup, setShowPopup] = useState(false);
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasLeftGroup, setHasLeftGroup] = useState(false);

  // Memoize participants calculation with optimized lookup
  const participants = useMemo(() => {
    if (!activeChat) return [];

    // Skip default "Chat" conversation
    if (activeChat.name === "Chat" && !activeChat.isGroup) {
      return [];
    }

    if (activeChat.isGroup) {
      const groupParticipants =
        activeChat.participants || activeChat.users || [];

      // Fixed: Use groupParticipants directly instead of userMap
      return groupParticipants.map((user) => {
        const userData = allUsers.find((u) => u._id === user._id);
        return userData || user;
      });
    }

    const other =
      activeChat.otherUser ||
      (activeChat.participants || activeChat.users || []).find(
        (u) => u._id !== currentUser?._id
      );

    return other ? [other] : [];
  }, [activeChat, currentUser?._id, allUsers]);

  // Check if current user is admin with optimized lookup
  const isAdmin = useMemo(() => {
    if (!activeChat || !currentUser) return false;

    const adminIds = new Set(
      [
        ...(activeChat.admin ? [activeChat.admin] : []),
        ...(activeChat.admin?._id ? [activeChat.admin?._id] : []),
        ...(activeChat.groupAdmin ? [activeChat.groupAdmin] : []),
        ...(activeChat.groupAdmin?._id ? [activeChat.groupAdmin?._id] : []),
      ].map((id) => String(id))
    );

    return adminIds.has(String(currentUser._id));
  }, [activeChat, currentUser]);

  // Reset showAddUserPopup when popup is first opened
  useEffect(() => {
    if (showPopup) {
      // Initially close the add user section when popup is opened
      setShowAddUserPopup(false);
    }
  }, [showPopup]);

  // Handle scroll to bottom with optimized performance
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight
        ) < 10;

      setIsScrolling(!isAtBottom);

      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };

    // تحسين الأداء باستخدام requestAnimationFrame
    let rafId;
    const handleScrollWithRAF = () => {
      rafId = requestAnimationFrame(handleScroll);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            handleScrollWithRAF();
          }
        });
      },
      { threshold: 0.9 }
    );

    observer.observe(messagesEndRef.current);

    return () => {
      observer.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [messagesEndRef, setIsScrolling]);

  // Load users when needed with optimized debouncing
  useEffect(() => {
    if (showAddUserPopup && allUsers.length === 0) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        dispatch(getAllUsers());
      });
    }
  }, [showAddUserPopup, dispatch, allUsers.length]);

  // Memoize popup content with optimized admin check and lazy loading
  const renderPopup = useCallback(() => {
    if (!showPopup || !activeChat) return null;

    // Pre-calculate admin status for group members
    const isGroupAdmin = activeChat.isGroup && isAdmin;

    return (
      <div
        ref={popupRef}
        className="absolute top-20 right-4 bg-white shadow-lg rounded-xl p-4 z-50 w-72 max-h-[70vh] overflow-y-auto custom-scrollbar"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#4D2D61 #f0f0f0" }}
      >
        <div className="flex justify-between items-center mb-2 sticky top-0 bg-white pb-2 z-10">
          <h4 className="text-[#4D2D61] font-bold text-sm">
            {activeChat.isGroup ? "Group Members" : "User Info"}
          </h4>
          {isGroupAdmin && (
            <button
              onClick={() => setShowAddUserPopup((prev) => !prev)}
              className="p-1 text-[#4D2D61] hover:text-[#57356A]"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Add User Section - Only visible when showAddUserPopup is true */}
        {showAddUserPopup && activeChat.isGroup && isAdmin && (
          <div className="mb-4 border-b pb-4">
            <div className="flex justify-between items-center mb-2 sticky top-10 bg-white z-10">
              <h5 className="text-[#4D2D61] font-medium text-sm">Add Users</h5>
              <button
                onClick={() => setShowAddUserPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="max-h-60 overflow-y-auto pr-1 mb-2 custom-scrollbar"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#4D2D61 #f0f0f0",
              }}
            >
              <ul className="space-y-2">
                {allUsers?.filter(Boolean).map((user) => {
                  const alreadyInGroup = participants.some(
                    (u) => u._id === user._id
                  );
                  return (
                    <li
                      key={user._id}
                      className={`flex items-center gap-2 p-1 rounded ${
                        alreadyInGroup
                          ? "bg-gray-200 cursor-not-allowed"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => {
                          if (!alreadyInGroup) {
                            toggleUserSelection(user._id);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => {
                            if (!alreadyInGroup) {
                              toggleUserSelection(user._id);
                            }
                          }}
                          disabled={alreadyInGroup}
                          className="h-3 w-3 text-[#4D2D61] rounded"
                        />
                        <img
                          src={
                            isValidImageUrl(user.avatar)
                              ? user.avatar
                              : defaultAvatar
                          }
                          className="w-6 h-6 rounded-full object-cover"
                          alt={user.name}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {user.fullName || user.name || user.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {alreadyInGroup ? "Already in group" : user.email}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <button
              onClick={handleAddSelectedUsers}
              disabled={selectedUsers.length === 0}
              className={`w-full text-xs mt-2 py-1 px-2 rounded ${
                selectedUsers.length > 0
                  ? "bg-[#4D2D61] hover:bg-[#3c224c] text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Add Selected Users
            </button>
          </div>
        )}

        <div
          className="max-h-60 overflow-y-auto pr-1 custom-scrollbar"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#4D2D61 #f0f0f0" }}
        >
          <ul className="space-y-2">
            {participants.map((user) => (
              <li
                key={user._id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      isValidImageUrl(user.avatar) ? user.avatar : defaultAvatar
                    }
                    className="w-8 h-8 rounded-full object-cover"
                    alt="avatar"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">
                      {user.fullName || user.name || user.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email || "No email"}
                    </p>
                  </div>
                </div>
                {activeChat.isGroup &&
                  isAdmin &&
                  user._id !== currentUser?._id && (
                    <button
                      onClick={() => handleRemoveUser(user._id)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove User"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  )}
              </li>
            ))}
          </ul>
        </div>

        {activeChat.isGroup && !isAdmin && (
          <div className="mt-4 sticky bottom-0 bg-white pt-2">
            <button
              onClick={handleLeaveGroup}
              className="w-full text-sm bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Leave Group
            </button>
          </div>
        )}
      </div>
    );
  }, [
    showPopup,
    showAddUserPopup,
    activeChat,
    participants,
    isAdmin,
    currentUser,
    allUsers,
    selectedUsers,
  ]);

  const handleAddUser = (userIds) => {
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    // Get the users to add from allUsers
    const usersToAdd = allUsers.filter((user) => userIds.includes(user._id));

    // Create a deep copy of the active chat to ensure it's extensible
    const updatedChat = JSON.parse(JSON.stringify(activeChat));

    // Add the users to the chat's participants/users arrays
    if (!updatedChat.participants) updatedChat.participants = [];
    if (!updatedChat.users) updatedChat.users = [];

    usersToAdd.forEach((user) => {
      // Only add if not already in the lists
      if (!updatedChat.participants.some((p) => p._id === user._id)) {
        updatedChat.participants.push({ ...user });
      }
      if (!updatedChat.users.some((u) => u._id === user._id)) {
        updatedChat.users.push({ ...user });
      }
    });

    // Update the active chat in context to immediately reflect changes in UI
    setActiveConversation(updatedChat);

    // Also dispatch the Redux actions to update the backend
    userIds.forEach((userId) => {
      dispatch(
        addUserToGroup({
          conversationId: activeChat.id,
          userId,
        })
      );
    });

    // Close the add user popup
    setShowAddUserPopup(false);

    // Clear selected users
    setSelectedUsers([]);

    // Show the main popup to see the updated members list
    setShowPopup(true);
  };

  const handleRemoveUser = (userId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this user from the group?"
      )
    ) {
      dispatch(
        removeUserFromGroup({
          conversationId: activeChat.id,
          userId,
        })
      );
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      dispatch(leaveGroup(activeChat.id));
      setShowPopup(false);
      setHasLeftGroup(true);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleAddSelectedUsers = () => {
    if (selectedUsers.length > 0) {
      handleAddUser(selectedUsers);
      // Only close the add user section, not the main popup
      setShowAddUserPopup(false);
    }
  };

  useEffect(() => {
    if (showAddUserPopup && allUsers.length === 0) {
      dispatch(getAllUsers());
    }
  }, [showAddUserPopup, dispatch, allUsers.length]);

  // Setup message listener
  useEffect(() => {
    const currentChatId = activeChat?.id;
    if (prevChatIdRef.current !== currentChatId) {
      dispatch(clearMessages());
    }
    prevChatIdRef.current = currentChatId;
  }, [activeChat?.id, dispatch]);

  // Setup message fetching and socket listeners
  useEffect(() => {
    if (!activeChat?.id) return;

    dispatch(fetchMessages({ conversationId: activeChat.id }));

    // Reset the hasLeftGroup state when switching chats
    setHasLeftGroup(false);

    const cleanups = [
      onMessage((message) => {
        if (message?.conversation?._id === activeChat.id) {
          dispatch(addMessage(message));
        }
      }),
      onTyping(({ conversationId, userId }) => {
        if (conversationId === activeChat.id && userId !== currentUser?._id) {
          dispatch(setIsTyping(true));
        }
      }),
      onStopTyping(({ conversationId, userId }) => {
        if (conversationId === activeChat.id && userId !== currentUser?._id) {
          dispatch(setIsTyping(false));
        }
      }),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
      dispatch(setIsTyping(false));
    };
  }, [activeChat?.id, currentUser?._id, dispatch]);

  // Handle click outside popup for all popups
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowPopup(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showPopup]);

  if (!activeChat?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg font-medium text-[#57356A]">
          Select a conversation to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <ChatHeader
        user={activeChat}
        onToggleInfo={() => setShowPopup((prev) => !prev)}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatMessages />
        {isTyping && !hasLeftGroup && (
          <div className="px-4 py-1 text-sm text-[#4D2D61]">
            {activeChat?.otherUser?.name || activeChat?.name || "User"} is
            typing...
          </div>
        )}
        {hasLeftGroup ? (
          <div className="px-4 py-3 bg-gray-100 text-center text-gray-700 font-medium">
            You have left the group
          </div>
        ) : (
          <ChatInput chatId={activeChat.id} />
        )}
      </div>
      {renderPopup()}
    </div>
  );
};

export default memo(ChatContainer);
