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
import {
  X,
  Minus,
  UserPlus,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axiosConfig";

const ChatContainer = ({ onBackClick, isMobile }) => {
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
  const [participantsWithStatus, setParticipantsWithStatus] = useState([]);

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
      <AnimatePresence>
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-16 right-4 bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100/50 rounded-3xl overflow-hidden z-50 w-80 max-h-[65vh]"
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Modern Header with Custom Purple Gradient */}
          <div
            className="relative p-5"
            style={{
              background: "linear-gradient(to right, #4d2d61,#7b4397)",
            }}
          >
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex justify-between items-center">
              <div>
                <h4 className="text-white font-bold text-lg tracking-tight">
                  {activeChat.isGroup ? "Group Members" : "User Info"}
                </h4>
                <p className="text-white/80 text-sm mt-1">
                  {participants.length}{" "}
                  {participants.length === 1 ? "member" : "members"}
                </p>
              </div>
              {isGroupAdmin && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddUserPopup((prev) => !prev)}
                  className="p-2.5 bg-white/20 backdrop-blur-sm text-white rounded-2xl hover:bg-white/30 transition-all duration-300 shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-5 max-h-[calc(65vh-90px)] overflow-y-auto custom-scrollbar">
            {/* Add User Section */}
            <AnimatePresence>
              {showAddUserPopup && activeChat.isGroup && isAdmin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-4 border border-gray-200/50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-gray-800 font-semibold text-sm flex items-center gap-2">
                      <UserPlus
                        className="w-3 h-3"
                        style={{ color: "#7b4397" }}
                      />
                      Add New Members
                    </h5>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowAddUserPopup(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all duration-200"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  </div>

                  <div className="max-h-32 overflow-y-auto mb-3 custom-scrollbar">
                    <div className="space-y-1.5">
                      {allUsers?.filter(Boolean).map((user, index) => {
                        const alreadyInGroup = participants.some(
                          (u) => u._id === user._id
                        );
                        return (
                          <motion.div
                            key={user._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                              alreadyInGroup
                                ? "bg-gray-100 opacity-50 cursor-not-allowed"
                                : selectedUsers.includes(user._id)
                                ? "border border-gray-200"
                                : "bg-white hover:bg-gray-50 border border-gray-100"
                            }`}
                            style={
                              selectedUsers.includes(user._id) &&
                              !alreadyInGroup
                                ? {
                                    background:
                                      "linear-gradient(to right, rgba(77, 45, 97, 0.1), rgba(107, 70, 193, 0.1))",
                                    borderColor: "#7b4397",
                                  }
                                : {}
                            }
                            onClick={() => {
                              if (!alreadyInGroup) {
                                toggleUserSelection(user._id);
                              }
                            }}
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user._id)}
                                onChange={() => {
                                  if (!alreadyInGroup) {
                                    toggleUserSelection(user._id);
                                  }
                                }}
                                disabled={alreadyInGroup}
                                className="h-3 w-3 rounded border-gray-300 focus:ring-2"
                                style={{
                                  accentColor: "#7b4397",
                                }}
                              />
                            </div>
                            <div className="relative">
                              <img
                                src={
                                  isValidImageUrl(user.avatar)
                                    ? user.avatar
                                    : defaultAvatar
                                }
                                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                alt={user.name}
                              />
                              {!alreadyInGroup && (
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${
                                    user.status === "online"
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                                  }`}
                                ></div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium text-gray-800 truncate text-xs">
                                {user.fullName || user.name || user.username}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {alreadyInGroup
                                  ? "Already in group"
                                  : user.email}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddSelectedUsers}
                    disabled={selectedUsers.length === 0}
                    className={`w-full text-xs py-2.5 px-3 rounded-xl font-medium transition-all duration-300 ${
                      selectedUsers.length > 0
                        ? "text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    style={
                      selectedUsers.length > 0
                        ? {
                            background:
                              "linear-gradient(to right, #4d2d61, #7b4397)",
                          }
                        : {}
                    }
                    onMouseEnter={(e) => {
                      if (selectedUsers.length > 0) {
                        e.target.style.background =
                          "linear-gradient(to right, #4d2d61, #7b4397)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedUsers.length > 0) {
                        e.target.style.background =
                          "linear-gradient(to right, #4d2d61, #7b4397)";
                      }
                    }}
                  >
                    Add {selectedUsers.length}{" "}
                    {selectedUsers.length === 1 ? "Member" : "Members"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Members List */}
            <div className="space-y-2.5">
              {participantsWithStatus.map((user, index) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center justify-between gap-3 p-3 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 rounded-2xl transition-all duration-300 border border-gray-100/50 hover:border-gray-200/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <img
                        src={
                          isValidImageUrl(user.avatar)
                            ? user.avatar
                            : defaultAvatar
                        }
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                        alt="avatar"
                      />
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                          user.status === "online"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      ></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {user.fullName || user.name || user.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email || "No email"}
                      </p>
                    </div>
                  </div>
                  {activeChat.isGroup &&
                    isAdmin &&
                    user._id !== currentUser?._id && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveUser(user._id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Remove User"
                      >
                        <Minus className="h-3 w-3" />
                      </motion.button>
                    )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Leave Group Button */}
          {activeChat.isGroup && !isAdmin && (
            <div className="p-5 pt-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLeaveGroup}
                className="w-full text-xs bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-2.5 px-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Leave Group
              </motion.button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
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
    participantsWithStatus,
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

  useEffect(() => {
    const fetchMembersStatus = async () => {
      if (showPopup && activeChat?.isGroup && participants.length > 0) {
        try {
          const ids = participants.map((u) => u._id);
          const { data } = await axios.post("/api/v1/users/statuses", { ids });
          // data.users: [{ _id, status, ... }]
          if (data.status === "success" && Array.isArray(data.users)) {
            setParticipantsWithStatus(
              participants.map((u) => ({
                ...u,
                status:
                  data.users.find((d) => d._id === u._id)?.status || u.status,
              }))
            );
          } else {
            setParticipantsWithStatus(participants); // fallback
          }
        } catch (err) {
          setParticipantsWithStatus(participants); // fallback
        }
      } else {
        setParticipantsWithStatus(participants);
      }
    };
    fetchMembersStatus();
  }, [showPopup, activeChat, participants]);

  // إذا لم يكن هناك محادثة نشطة، اعرض شاشة ترحيب
  if (!activeChat?.id) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
        {/* زر الرجوع للموبايل عندما لا توجد محادثة نشطة */}
        {isMobile && onBackClick && (
          <div className="p-4 border-b border-gray-200/60">
            <button
              onClick={onBackClick}
              className="flex items-center gap-3 text-[#4d2d61] hover:text-[#7b4397]transition-colors duration-300 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Conversations</span>
            </button>
          </div>
        )}

        {/* شاشة الترحيب */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative mb-6"
            >
              <div className="w-26 h-26 mx-auto bg-gradient-to-br from-[#4d2d61]/10 to-[#7b4397]/10 rounded-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#4d2d61]/5 to-[#7b4397]/5 animate-pulse"></div>
                <MessageCircle className="w-12 h-12 text-[#4d2d61] relative z-10" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="absolute inset-2 border-2 border-dashed border-[#4d2d61]/20 rounded-full"
                ></motion.div>
              </div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-2 right-2"
              >
                <Sparkles className="w-6 h-6 text-[#7b4397]" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-[28px] font-bold bg-gradient-to-r from-[#4d2d61] to-[#7b4397] bg-clip-text text-transparent mb-4"
            >
              Welcome to Nexus Chat
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-gray-600 text-md mb-8 leading-relaxed"
            >
              Select a conversation from the sidebar to start chatting, or
              create a new conversation to connect with your team.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Real-time messaging</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4d2d61]" />
                  <span>Group conversations</span>
                </div>
              </div>

              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 rounded-full text-[#4D2D61] font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Start your first conversation</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <ChatHeader
        user={activeChat}
        onToggleInfo={() => setShowPopup((prev) => !prev)}
        onBackClick={isMobile ? onBackClick : undefined}
        isMobile={isMobile}
      />
      <div className="flex-1 min-h-0 flex flex-col relative">
        <ChatMessages />
        <AnimatePresence>
          {isTyping && !hasLeftGroup && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-6 py-3 mx-4 mb-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0,
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#7b4397" }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.2,
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#7b4397" }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.4,
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#7b4397" }}
                  />
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {activeChat?.otherUser?.name || activeChat?.name || "User"} is
                  typing...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {hasLeftGroup ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-center rounded-2xl border border-gray-200"
          >
            <span className="text-gray-600 font-medium">
              You have left the group
            </span>
          </motion.div>
        ) : (
          <ChatInput chatId={activeChat.id} />
        )}
      </div>
      {renderPopup()}
    </div>
  );
};

export default memo(ChatContainer);
