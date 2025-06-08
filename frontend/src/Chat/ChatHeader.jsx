"use client";

import { useSelector } from "react-redux";
import { FiMoreVertical } from "react-icons/fi";
import { useChat } from "../context/chat-context";
import { useMemo } from "react";
import Avatar from "../assets/defaultAvatar.png";
import { motion } from "framer-motion";
import { isValidImageUrl, getAvatarUrl } from "../utils/imageUtils";
import ImageWithFallback from "../Components/ImageWithFallback"; // Assuming you have this component
import { Suspense } from "react";
import { useCallback } from "react";

function ChatHeader({ user, onToggleInfo }) {
  const { currentUser } = useChat();
  const { onlineUsers } = useSelector((state) => state.chat);
  const chatUser = user || {};

  // إنشاء Map للمستخدمين لتحسين الأداء
  const userMap = useMemo(() => {
    if (!chatUser.isGroup) {
      const map = new Map();
      const users = chatUser.participants || chatUser.users || [];
      users.forEach((user) => {
        map.set(user._id, user);
      });
      return map;
    }
    return null;
  }, [chatUser.participants, chatUser.users]);

  // تحسين كشف حالة الاتصال
  const isUserOnline = useCallback(
    (userId) => {
      if (!onlineUsers) return false;
      return onlineUsers.some((u) => u.userId === userId);
    },
    [onlineUsers]
  );

  const otherUser = useMemo(() => {
    try {
      if (!chatUser)
        return {
          id: null,
          name: "Unknown User",
          avatar: null,
          isOnline: false,
        };

      // Group Chat
      if (chatUser.isGroup) {
        return {
          id: chatUser.id,
          name: chatUser.name || "Group Chat",
          avatar: chatUser.picture || Avatar,
          isOnline: false,
          isGroup: true,
        };
      }

      // Private Chat
      const other = userMap?.get(
        [...userMap.keys()].find((id) => id !== currentUser?._id)
      );

      if (!other) {
        console.warn("User not found in map:", currentUser?._id);
        return {
          id: null,
          name: "Unknown User",
          avatar: null,
          isOnline: false,
        };
      }

      const displayPicture = isValidImageUrl(other.avatar)
        ? getAvatarUrl(other.avatar)
        : Avatar;

      return {
        id: other._id || other.id || null,
        name: other.fullName || other.username || other.email || "Unknown User",
        avatar: displayPicture,
        isOnline: isUserOnline(other._id),
        isGroup: false,
        admin: chatUser.admin,
      };
    } catch (error) {
      console.error("Error in otherUser calculation:", error);
      return { id: null, name: "Unknown User", avatar: null, isOnline: false };
    }
  }, [chatUser, currentUser?._id, userMap, isUserOnline]);

  return (
    <div className="bg-white flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 relative">
          <Suspense
            fallback={
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
                {otherUser.name?.[0]?.toUpperCase() || "?"}
              </div>
            }
          >
            {otherUser.avatar ? (
              <ImageWithFallback
                src={otherUser.avatar}
                alt={otherUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
                {otherUser.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </Suspense>
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
