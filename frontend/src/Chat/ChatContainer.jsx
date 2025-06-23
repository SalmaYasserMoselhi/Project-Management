"use client";

import { useEffect, useRef, memo, useState, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import ChatInfoPopup from "./ChatInfoPopup";
import {
  addMessage,
  setIsTyping,
  fetchMessages,
  clearMessages,
  addUserToGroup,
  getAllUsers,
  removeUserFromGroup,
  leaveGroup,
  fetchConversations,
  handleMessageDeleted,
  deleteGroup,
  deleteConversation,
} from "../features/Slice/ChatSlice/chatSlice";
import { onMessage, onTyping, onStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context";
import { motion, AnimatePresence } from "framer-motion";

const ChatContainer = ({ onBackClick, isMobile }) => {
  const dispatch = useDispatch();
  const { isTyping } = useSelector((state) => state.chat);
  const { currentUser, activeChat, setActiveConversation } = useChat();
  const allUsers = useSelector((state) => state.chat.users || []);
  const prevChatIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const [showPopup, setShowPopup] = useState(false);
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

  // Load users when popup opens
  useEffect(() => {
    if (showPopup && allUsers.length === 0) {
      dispatch(getAllUsers());
    }
  }, [showPopup, dispatch, allUsers.length]);

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
  };

  const handleRemoveUser = (userId) => {
    // Create a deep copy of the active chat to ensure it's extensible
    const updatedChat = JSON.parse(JSON.stringify(activeChat));

    // Remove the user from the chat's participants/users arrays
    if (updatedChat.participants) {
      updatedChat.participants = updatedChat.participants.filter(
        (p) => p._id !== userId
      );
    }
    if (updatedChat.users) {
      updatedChat.users = updatedChat.users.filter((u) => u._id !== userId);
    }

    // Update the active chat in context to immediately reflect changes in UI
    setActiveConversation(updatedChat);

    // Also dispatch the Redux action to update the backend
    dispatch(
      removeUserFromGroup({
        conversationId: activeChat.id,
        userId,
      })
    );
  };

  const handleLeaveGroup = async () => {
    try {
      // Dispatch leave group action
      await dispatch(leaveGroup(activeChat.id)).unwrap();

      // Close popup immediately
      setShowPopup(false);

      // Set has left state to show message and hide input
      setHasLeftGroup(true);

      // After a short delay, clear the active chat and refresh conversations
      setTimeout(() => {
        setActiveConversation(null);
        // Refresh conversations to remove the left group from list
        dispatch(fetchConversations());
      }, 2000);
    } catch (error) {
      console.error("Failed to leave group:", error);
      // Handle error if needed
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await dispatch(deleteGroup(activeChat.id)).unwrap();
      setShowPopup(false);
      setActiveConversation(null);
      dispatch(fetchConversations());
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleDeleteConversation = async () => {
    try {
      await dispatch(deleteConversation(activeChat.id)).unwrap();
      setShowPopup(false);
      setActiveConversation(null);
      dispatch(fetchConversations());
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

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

  // إذا لم يكن هناك محادثة نشطة، اعرض شاشة ترحيب
  if (!activeChat?.id) {
    return <ChatWelcomeScreen isMobile={isMobile} onBackClick={onBackClick} />;
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
            className="mx-4 mb-4 px-6 py-4 bg-white text-center rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
              <span className="text-gray-600 font-semibold text-sm">
                You have left the group
              </span>
            </div>
            <p className="text-gray-500 text-xs">
              You will be redirected shortly...
            </p>
          </motion.div>
        ) : (
          <ChatInput chatId={activeChat.id} />
        )}
      </div>
      <ChatInfoPopup
        showPopup={showPopup}
        onClose={() => {
          setShowPopup(false);
        }}
        activeChat={activeChat}
        participants={participants}
        isAdmin={isAdmin}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        onLeaveGroup={handleLeaveGroup}
        hasLeftGroup={hasLeftGroup}
        onDeleteGroup={handleDeleteGroup}
        onDeleteConversation={handleDeleteConversation}
      />
    </div>
  );
};

export default memo(ChatContainer);
