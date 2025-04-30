"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FiDownload, FiFile } from "react-icons/fi";
import { useChat } from "../context/chat-context";
import Avatar from "../assets/defaultAvatar.png";
import { emitTyping, emitStopTyping, joinConversation } from "../utils/socket";

const MessageBubble = ({ message, isSender, showAvatar = true }) => {
  const { activeChat } = useChat();

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return Avatar;
    if (avatarPath.startsWith("http")) return avatarPath;
    return `/api/v1/uploads/users/${avatarPath}`;
  };

  const getSenderName = () => {
    const sender = message.sender;
    if (!sender) return "";

    return sender.username || "";
  };

  const getMessageContent = () => {
    // إضافة console.log لفحص محتوى الرسالة
    console.log("Message content:", message);

    // التأكد من وجود محتوى الرسالة
    const messageText = message.content || message.message || "";

    switch (message.type) {
      case "text":
        return <p className="text-[0.9rem] leading-[1.4]">{messageText}</p>;

      case "image":
        return (
          <img
            src={messageText}
            alt="Message"
            className="max-w-[300px] rounded-lg"
            loading="lazy"
          />
        );

      case "file":
        return (
          <div className="flex items-center gap-2 bg-white/80 p-3 rounded-lg">
            <FiFile className="w-6 h-6 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{message.fileName}</p>
              <p className="text-xs text-gray-500">
                {(message.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <a
              href={message.fileUrl}
              download={message.fileName}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Download File"
            >
              <FiDownload className="w-4 h-4" />
            </a>
          </div>
        );

      default:
        return <p className="text-[0.9rem] leading-[1.4]">{messageText}</p>;
    }
  };

  return (
    <div
      className={`flex gap-2 mb-1 ${
        isSender ? "justify-end" : "justify-start"
      }`}
    >
      {!isSender ? (
        <div className="w-[40px] flex-shrink-0">
          {showAvatar && activeChat?.isGroup && (
            <img
              src={getAvatarUrl(message.sender?.avatar)}
              alt={getSenderName()}
              className="w-[40px] h-[40px] rounded-full"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = Avatar;
              }}
            />
          )}
        </div>
      ) : null}

      <div className="flex flex-col min-w-[100px] max-w-[75%]">
        {!isSender && showAvatar && activeChat?.isGroup && (
          <span className="text-xs text-gray-600 mb-1">{getSenderName()}</span>
        )}
        <div
          className={`rounded-xl px-3 py-2 ${
            isSender
              ? "bg-[#4D2D618F] text-white ml-auto"
              : "bg-white text-gray-800"
          }`}
          style={{ minWidth: "100px" }}
        >
          {getMessageContent()}
          <div className="flex justify-end items-center gap-1 mt-1">
            <span className="text-[0.65rem] opacity-75">
              {format(new Date(message.createdAt), "p", { locale: ar })}
            </span>
          </div>
        </div>
      </div>

      {isSender && <div className="w-[40px] flex-shrink-0"></div>}
    </div>
  );
};

export default function ChatMessages() {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const dispatch = useDispatch();
  const {
    messages = [],
    status,
    isTyping,
  } = useSelector((state) => state.chat);
  const { currentUser, activeChat } = useChat();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Scroll to the most recent message
  const scrollToBottom = (behavior = "auto") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  // Initial load - scroll to bottom immediately
  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      setTimeout(() => {
        scrollToBottom();
        setIsInitialLoad(false);
      }, 100);
    }
  }, [messages, isInitialLoad]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!isInitialLoad && messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages, isInitialLoad]);

  // Join conversation room when activeChat changes
  useEffect(() => {
    if (activeChat?._id) {
      joinConversation(activeChat._id);
      setIsInitialLoad(true);
    }
  }, [activeChat?._id]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = {};
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toLocaleDateString();
      let displayDate = messageDate;

      if (messageDate === today) {
        displayDate = "today";
      } else if (messageDate === yesterday) {
        displayDate = "yesterday";
      }

      if (!groups[displayDate]) {
        groups[displayDate] = [];
      }
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
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
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
          ))}

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
                <span className="text-sm">جاري الكتابة...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
