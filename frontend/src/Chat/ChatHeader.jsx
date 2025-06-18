"use client";

import { useSelector } from "react-redux";
import { FiMoreVertical } from "react-icons/fi";
import { IoMdArrowBack } from "react-icons/io";
import { useChat } from "../context/chat-context";
import { useMemo, useCallback } from "react";
import Avatar from "../assets/defaultAvatar.png";
import {
  isValidImageUrl,
  getAvatarUrl,
  getGroupImageUrl,
} from "../utils/imageUtils";
import ImageWithFallback from "../Components/ImageWithFallback";
import { Suspense } from "react";
import { motion } from "framer-motion";

function ChatHeader({ user, onToggleInfo, onBackClick, isMobile }) {
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
          avatar: getGroupImageUrl(chatUser.picture) || Avatar,
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
    <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        {/* زر الرجوع للموبايل */}
        {isMobile && onBackClick && (
          <button
            onClick={onBackClick}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <IoMdArrowBack className="w-5 h-5 text-[#4d2d61]" />
          </button>
        )}

        <div className="w-10 h-10 relative group">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-full h-full rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white ring-purple-200"
          >
            <Suspense
              fallback={
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-semibold bg-[#4d2d61]">
                  {otherUser.name?.[0]?.toUpperCase() || "?"}
                </div>
              }
            >
              {otherUser.avatar ? (
                <ImageWithFallback
                  src={otherUser.avatar || "/placeholder.svg"}
                  alt={otherUser.name}
                  className="w-full h-full rounded-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-semibold bg-[#4d2d61]">
                  {otherUser.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </Suspense>
          </motion.div>
          {otherUser.isOnline && !otherUser.isGroup && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"
            />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-[#4d2d61] text-base">
            {otherUser.name}
          </h3>
          <p className="text-xs text-gray-500 flex items-center">
            {otherUser.isGroup ? (
              "Group Chat"
            ) : otherUser.isOnline ? (
              <span className="text-green-500">Online</span>
            ) : (
              <span>Offline</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-2 hover:bg-gray-100 rounded-full text-[#4d2d61] transition-colors"
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
