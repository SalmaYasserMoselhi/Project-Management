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
} from "../features/Slice/ChatSlice/chatSlice";
import { onMessage, onTyping, onStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context";
import defaultAvatar from "../assets/defaultAvatar.png";
import { isValidImageUrl } from "../utils/imageUtils";

const ChatContainer = () => {
  const dispatch = useDispatch();
  const { isTyping } = useSelector((state) => state.chat);
  const { currentUser, activeChat } = useChat();
  const prevChatIdRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);

  // Memoize participants calculation
  const participants = useMemo(() => {
    if (!activeChat) return [];

    if (activeChat.isGroup) {
      return activeChat.participants || [];
    }

    const other =
      activeChat.otherUser ||
      (activeChat.participants || activeChat.users || []).find(
        (u) => u?._id !== currentUser?._id
      );

    return other ? [other] : [];
  }, [activeChat, currentUser?._id]);

  // Memoize popup content
  const renderPopup = useCallback(() => {
    if (!showPopup || !activeChat) return null;

    return (
      <div
        ref={popupRef}
        className="absolute top-20 right-4 bg-white shadow-lg rounded-xl p-4 z-50 w-72 max-h-80 overflow-auto"
      >
        <h4 className="text-[#4D2D61] font-bold mb-2 text-sm">
          {activeChat.isGroup ? "Group Members" : "User Info"}
        </h4>
        <ul className="space-y-2">
          {participants.filter(Boolean).map((user) => (
            <li key={user._id || user.id} className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <img
                  src={
                    isValidImageUrl(user.avatar) ? user.avatar : defaultAvatar
                  }
                  alt={user.name || user.username || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultAvatar;
                  }}
                />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-800">
                  {user.fullName || user.name || user.username || "User"}
                </p>
                <p className="text-xs text-gray-500">
                  {user.email || "No email"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }, [showPopup, activeChat, participants]);

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

  // Handle click outside popup
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
        {isTyping && (
          <div className="px-4 py-1 text-sm text-[#4D2D61]">
            {activeChat?.otherUser?.name || activeChat?.name || "User"} is
            typing...
          </div>
        )}
        <ChatInput chatId={activeChat.id} />
      </div>
      {renderPopup()}
    </div>
  );
};

export default memo(ChatContainer);
