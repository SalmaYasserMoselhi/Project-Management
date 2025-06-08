"use client";

import React, { useState } from "react";

import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { useChat } from "../context/chat-context";
import Avatar from "../assets/defaultAvatar.png";

import { getAvatarUrl } from "../utils/imageUtils";
import renderContent from "./renderContent";
import { useDispatch } from "react-redux";
import { deleteMessage } from "../features/Slice/ChatSlice/chatSlice";
import { toast } from "react-hot-toast";

const MessageBubble = React.memo(({ message, isSender, showAvatar = true }) => {
  const { activeChat } = useChat();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const dispatch = useDispatch();

  const getSenderName = () => {
    const sender = message.sender;
    return sender?.username || "";
  };
  const handleDelete = async () => {
    try {
      const resultAction = await dispatch(deleteMessage(message._id)).unwrap();
      setIsDeleted(true);
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(error || "Failed to delete message");
    }
  };

  if (isDeleted) {
    return (
      <div className="flex justify-center text-gray-500 text-sm italic my-2">
        You deleted this message
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 mb-1 ${
        isSender ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar container - always same width for consistent alignment */}
      <div className="w-[40px] flex-shrink-0">
        {!isSender && showAvatar && activeChat?.isGroup && (
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

      <div className="flex flex-col min-w-[100px] max-w-[75%]">
        {!isSender && showAvatar && activeChat?.isGroup && (
          <span className="text-xs text-gray-600 mb-1">{getSenderName()}</span>
        )}
        <div
          className={`rounded-xl px-3 py-2 relative ${
            isSender ? "bg-[#4D2D618F] text-white" : "bg-white text-gray-800"
          }`}
          style={{ minWidth: "100px" }}
        >
          {renderContent(message)}
          <div className="flex justify-end items-center gap-1 mt-1">
            {isSender && isHovered && (
              <button
                onClick={handleDelete}
                className="text-xs text-gray-200 hover:text-gray transition-colors"
              >
                Delete
              </button>
            )}
            <span className="text-[0.65rem] opacity-75">
              {format(new Date(message.createdAt), "p", { locale: ar })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
export default MessageBubble;
