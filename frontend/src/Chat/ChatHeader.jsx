"use client";

import { useSelector } from "react-redux";
import { FiPhone, FiVideo, FiMoreVertical } from "react-icons/fi";
import { useChat } from "../context/chat-context";
import { useMemo } from "react";
import Avatar from "../assets/defaultAvatar.png";
import { motion } from "framer-motion";
import { isValidImageUrl, getAvatarUrl } from "../utils/imageUtils";

function ChatHeader({ user, onToggleInfo }) {
  const { currentUser } = useChat();
  const { onlineUsers } = useSelector((state) => state.chat);
  const chatUser = user || {};

  const otherUser = useMemo(() => {
    if (!chatUser)
      return { id: null, name: "Chat", avatar: null, isOnline: false };

    // Group Chat
    if (chatUser.isGroup) {
      return {
        id: chatUser.id,
        name: chatUser.name || "Group Chat",
        avatar:
          chatUser.picture || "https://image.pngaaa.com/78/6179078-middle.png",
        isOnline: false,
        isGroup: true,
      };
    }

    // Private Chat
    const other =
      chatUser.otherUser ||
      (chatUser.participants || chatUser.users || []).find(
        (u) => u._id !== currentUser?._id
      );

    if (!other)
      return { id: null, name: "Chat", avatar: null, isOnline: false };

    const displayPicture = isValidImageUrl(other.avatar)
      ? getAvatarUrl(other.avatar)
      : Avatar;

    return {
      id: other._id || other.id || null,
      name: other.fullName || "User", // ← Full name only
      avatar: displayPicture,
      isOnline: onlineUsers?.some(
        (u) => u.userId === other._id || u.userId === other.id
      ),
      isGroup: false,
    };
  }, [chatUser, currentUser, onlineUsers]);

  return (
    <div className="bg-white flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 relative">
          {otherUser.avatar ? (
            <img
              src={otherUser.avatar}
              alt={otherUser.name}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = Avatar;
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
              {otherUser.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          {otherUser.isOnline && !otherUser.isGroup && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-[#4D2D61]">{otherUser.name}</h3>
          <p className="text-xs text-gray-500">
            {otherUser.isGroup ? (
              <motion.span
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                Group Chat
              </motion.span>
            ) : otherUser.isOnline ? (
              "Online"
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="Voice Call"
        >
          <FiPhone className="w-5 h-5" />
        </button>

        <button
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="Video Call"
        >
          <FiVideo className="w-5 h-5" />
        </button>

        <button
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="More Options"
          onClick={onToggleInfo}
        >
          <FiMoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
