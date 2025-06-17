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
      const displayDate =
        messageDate === today
          ? "Today"
          : messageDate === yesterday
          ? "Yesterday"
          : messageDate;
      if (!groups[displayDate]) groups[displayDate] = [];
      groups[displayDate].push(message);
    });

    return groups;
  }, [messages]);

  const shouldShowAvatar = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    return previousMessage.sender._id !== currentMessage.sender._id;
  };

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      style={{
        height: "calc(100vh - 140px)",
        backgroundColor: "#F5F5F5",
        scrollBehavior: "smooth",
      }}
    >
      <div className="flex flex-col justify-end min-h-full">
        <div className="space-y-1">
          {Object.entries(groupedMessages).length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-12">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 mx-auto max-w-xs">
                <div className="text-gray-400 mb-2">💬</div>
                <div>No messages yet</div>
                <div className="text-xs text-gray-400 mt-1">
                  Start the conversation!
                </div>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="space-y-1 mb-6">
                {/* Enhanced Date Separator */}
                <div className="flex justify-center my-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300/50"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white/80 backdrop-blur-sm text-[#4d2d61] px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-gray-200/50">
                        {date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-1">
                  {dateMessages.map((message, index) => {
                    const previousMessage =
                      index > 0 ? dateMessages[index - 1] : null;
                    const nextMessage =
                      index < dateMessages.length - 1
                        ? dateMessages[index + 1]
                        : null;
                    const showAvatar = shouldShowAvatar(
                      message,
                      previousMessage
                    );
                    const isLastInGroup =
                      !nextMessage ||
                      nextMessage.sender._id !== message.sender._id;

                    return (
                      <div
                        key={message._id || `msg-${index}`}
                        className="animate-fadeIn"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animationFillMode: "both",
                        }}
                      >
                        <MessageBubble
                          message={message}
                          isSender={message.sender._id === currentUser?._id}
                          showAvatar={showAvatar}
                          isLastInGroup={isLastInGroup}
                          previousMessage={previousMessage}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Enhanced Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 mb-4 animate-fadeIn">
              <div className="w-[40px] flex-shrink-0">
                <img
                  src={Avatar || "/placeholder.svg"}
                  alt="typing"
                  className="w-[40px] h-[40px] rounded-full ring-2 ring-gray-200"
                />
              </div>
              <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl text-gray-600 shadow-sm border border-gray-200/50">
                <div className="flex items-center gap-1">
                  <span className="text-sm">Typing</span>
                  <div className="flex gap-1">
                    <div
                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Spacer for input area */}
      <div className="h-12"></div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
});

export default ChatMessages;
