"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useLayoutEffect,
} from "react";
import { useSelector, useDispatch } from "react-redux";

import { useChat } from "../context/chat-context";
import Avatar from "../assets/defaultAvatar.png";
import { joinConversation } from "../utils/socket";

import MessageBubble from "./MessageBubble";

const ChatMessages = React.memo(() => {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const dispatch = useDispatch();
  const { messages = [], isTyping } = useSelector((state) => state.chat);
  const { currentUser, activeChat } = useChat();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const prevMessagesLength = useRef(0);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useLayoutEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (activeChat?._id) {
      joinConversation(activeChat._id);
      setIsInitialLoad(true);
    }
  }, [activeChat?._id]);

  const groupedMessages = useMemo(() => {
    const groups = {};
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toLocaleDateString();
      let displayDate =
        messageDate === today
          ? "today"
          : messageDate === yesterday
          ? "yesterday"
          : messageDate;
      if (!groups[displayDate]) groups[displayDate] = [];
      groups[displayDate].push(message);
    });

    return groups;
  }, [messages]);

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto px-3"
      style={{
        height: "calc(100vh - 140px)",
        backgroundColor: "#F5F5F5",
      }}
    >
      <div className="flex flex-col justify-end min-h-full py-4">
        <div className="space-y-4">
          {Object.entries(groupedMessages).length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              No messages yet
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="space-y-1">
                <div className="flex justify-center mb-3">
                  <span className="text-sm bg-white text-[#4D2D61] px-4 py-2 rounded-2xl">
                    {date}
                  </span>
                </div>
                {dateMessages.map((message, index) => (
                  <MessageBubble
                    key={message._id || `msg-${index}`}
                    message={message}
                    isSender={message.sender._id === currentUser?._id}
                    showAvatar={
                      index === 0 ||
                      dateMessages[index - 1]?.sender._id !== message.sender._id
                    }
                  />
                ))}
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex gap-2">
              <div className="w-[40px]">
                <img
                  src={Avatar}
                  alt="typing"
                  className="w-[40px] h-[40px] rounded-full"
                />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-2xl text-gray-600">
                <span className="text-sm">Typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
});

export default ChatMessages;
