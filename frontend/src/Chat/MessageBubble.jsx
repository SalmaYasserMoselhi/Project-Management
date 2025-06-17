"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { useChat } from "../context/chat-context";
import Avatar from "../assets/defaultAvatar.png";
import { getAvatarUrl } from "../utils/imageUtils";
import renderContent from "./renderContent";
import { useDispatch } from "react-redux";
import { deleteMessage } from "../features/Slice/ChatSlice/chatSlice";
import { toast } from "react-hot-toast";

const MessageBubble = React.memo(
  ({
    message,
    isSender,
    showAvatar = true,
    isLastInGroup = true,
    previousMessage,
  }) => {
    const { activeChat } = useChat();
    const [isHovered, setIsHovered] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const dispatch = useDispatch();

    const getSenderName = () => {
      const sender = message.sender;
      return sender?.username || sender?.fullName || "";
    };

    const handleDelete = async () => {
      if (isDeleting) return;

      setIsDeleting(true);
      try {
        await dispatch(deleteMessage(message._id)).unwrap();
        setIsDeleted(true);
        toast.success("Message deleted successfully");
      } catch (error) {
        toast.error(error || "Failed to delete message");
        setIsDeleting(false);
      }
    };

    if (isDeleted) {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-gray-100/80 backdrop-blur-sm text-gray-500 text-sm italic px-4 py-2 rounded-full border border-gray-200/50">
            🗑️ You deleted this message
          </div>
        </div>
      );
    }

    const messageTime = format(new Date(message.createdAt), "HH:mm");
    const isConsecutive =
      previousMessage && previousMessage.sender._id === message.sender._id;

    return (
      <div
        className={`flex gap-2 group transition-all duration-200 ${
          isSender ? "flex-row-reverse" : "flex-row"
        } ${isConsecutive ? "mb-0.5" : "mt-2"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar container */}
        <div className="w-[40px] flex-shrink-0">
          {!isSender && showAvatar && activeChat?.isGroup && (
            <img
              src={getAvatarUrl(message.sender?.avatar) || "/placeholder.svg"}
              alt={getSenderName()}
              className="w-[40px] h-[40px] rounded-full ring-2 ring-gray-200/50 transition-all duration-200 group-hover:ring-purple-200"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = Avatar;
              }}
            />
          )}
        </div>

        <div className="flex flex-col min-w-[100px] max-w-[75%]">
          {/* Sender name for group chats */}
          {!isSender && showAvatar && activeChat?.isGroup && (
            <span className="text-xs text-gray-600 mb-1 px-1 font-medium">
              {getSenderName()}
            </span>
          )}

          <div className="relative">
            {/* Message bubble */}
            <div
              className={`rounded-2xl px-4 py-3 relative transition-all duration-200 shadow-sm ${
                isSender
                  ? "bg-gradient-to-r from-[#4D2D61] to-[#6B46C1] ml-auto"
                  : "bg-white/90 backdrop-blur-sm text-gray-800 border border-gray-200/50"
              } ${isHovered ? "shadow-md transform scale-[1.02]" : ""}`}
              style={{
                minWidth: "80px",
                color: isSender ? "#ffffff" : "#000000",
                borderRadius: isSender
                  ? `18px 18px ${isLastInGroup ? "6px" : "18px"} 18px`
                  : `18px 18px 18px ${isLastInGroup ? "6px" : "18px"}`,
              }}
            >
              {renderContent(message, isSender)}

              {/* Message time and actions */}
              <div
                className={`flex items-center gap-2 mt-2 ${
                  isSender ? "justify-end" : "justify-end"
                }`}
              >
                {/* Delete button for sender */}
                {isSender && isHovered && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${
                      isDeleting
                        ? "bg-red-200 text-red-500 cursor-not-allowed"
                        : "bg-white/20 text-white hover:bg-red-500 hover:text-white"
                    }`}
                  >
                    {isDeleting ? "⏳" : "🗑️"}
                  </button>
                )}

                {/* Message time */}
                <span
                  style={{ color: isSender ? "#ffffff" : "#6b7280" }}
                  className="text-[0.65rem]"
                >
                  {messageTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default MessageBubble;
