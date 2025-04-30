"use client";

import { useEffect, useRef } from "react";
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

function ChatContainer() {
  const dispatch = useDispatch();
  const { isTyping } = useSelector((state) => state.chat);
  const { currentUser, activeChat } = useChat();
  const prevChatIdRef = useRef(null);

  useEffect(() => {
    const currentChatId = activeChat?.id;
    if (prevChatIdRef.current !== currentChatId) {
      dispatch(clearMessages());
    }
    prevChatIdRef.current = currentChatId;
  }, [activeChat?.id, dispatch]);

  useEffect(() => {
    if (activeChat?.id) {
      dispatch(fetchMessages({ conversationId: activeChat.id }));

      let messageCleanup = () => {};
      let typingCleanup = () => {};
      let stopTypingCleanup = () => {};

      const setupListeners = () => {
        messageCleanup = onMessage((message) => {
          if (message?.conversation?._id === activeChat.id) {
            dispatch(addMessage(message));
          }
        });

        typingCleanup = onTyping(({ conversationId, userId }) => {
          if (conversationId === activeChat.id && userId !== currentUser?._id) {
            dispatch(setIsTyping(true));
          }
        });

        stopTypingCleanup = onStopTyping(() => {
          dispatch(setIsTyping(false));
        });
      };

      setupListeners();

      return () => {
        messageCleanup();
        typingCleanup();
        stopTypingCleanup();
        dispatch(setIsTyping(false));
      };
    }
  }, [activeChat?.id, currentUser?._id, dispatch]);

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
    <div className="flex flex-col h-full">
      <ChatHeader user={activeChat} />
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
    </div>
  );
}

export default ChatContainer;
