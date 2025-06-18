import { useMemo } from "react";
import { dateHandler } from "../utils/Date";
import Avatar from "../assets/defaultAvatar.png";
import {
  isValidImageUrl,
  getAvatarUrl,
  getGroupImageUrl,
} from "../utils/imageUtils";
import React, { Suspense } from "react";
import { motion } from "framer-motion";

const ConversationItem = React.memo(
  ({ chat, currentUser, isActive, onConversationClick }) => {
    // إنشاء Map للمستخدمين لتحسين الأداء
    const userMap = useMemo(() => {
      const map = new Map();
      const users = chat.users || chat.participants || [];
      users.forEach((user) => {
        map.set(user._id, user);
      });
      return map;
    }, [chat.users, chat.participants]);

    // تكوين اسم العرض والصورة باستخدام Map
    const { displayName, displayPicture } = useMemo(() => {
      const isGroupChat = chat.isGroup === true;

      if (isGroupChat) {
        return {
          displayName: chat.name || "Group",
          displayPicture:
            getGroupImageUrl(chat.picture) ||
            "https://image.pngaaa.com/78/6179078-middle.png",
        };
      }

      // استخدام Map للحصول على المستخدم الآخر
      const otherUser = userMap.get(
        [...userMap.keys()].find((id) => id !== currentUser?._id)
      );

      if (!otherUser) {
        console.warn("Could not find other user in conversation:", chat._id);
        return {
          displayName: "Unknown User",
          displayPicture: Avatar,
        };
      }

      // تكوين اسم العرض من بيانات المستخدم الآخر
      const displayName =
        otherUser.fullName ||
        `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
        otherUser.username ||
        otherUser.email ||
        "Unknown User";

      // تحديد الصورة الشخصية للمستخدم الآخر
      const displayPicture =
        otherUser.avatar && otherUser.avatar !== "default.jpg"
          ? getAvatarUrl(otherUser.avatar)
          : Avatar;

      return { displayName, displayPicture };
    }, [chat.isGroup, chat.name, chat.picture, userMap, currentUser?._id]);

    return (
      <motion.div
        className={`group relative flex items-center p-3 mx-2 my-1 cursor-pointer rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
          isActive
            ? "bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 border border-[#4d2d61]/20 shadow-lg shadow-[#4d2d61]/10"
            : "hover:bg-gradient-to-r hover:from-[#4d2d61]/5 hover:to-[#7b4397]/5 hover:shadow-md hover:shadow-[#4d2d61]/5 border border-transparent hover:border-[#4D2D61]/10"
        }`}
        onClick={() => onConversationClick(chat)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Active indicator */}
        {isActive && (
          <motion.div
            className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#4d2d61] to-[#7b4397] rounded-r-full"
            layoutId="activeIndicator"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <div className="relative flex-shrink-0 mr-4">
          <Suspense
            fallback={
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold bg-gradient-to-r from-[#4d2d61] to-[#7b4397] shadow-md">
                {displayName?.[0]?.toUpperCase() || "?"}
              </div>
            }
          >
            {isValidImageUrl(displayPicture) ? (
              <div className="relative">
                <img
                  src={displayPicture || "/placeholder.svg"}
                  alt={displayName}
                  loading="lazy"
                  className={`w-10 h-10 rounded-full object-cover border-2 transition-all duration-300 shadow-md ${
                    isActive
                      ? "border-[#4d2d61]/30 shadow-[#4d2d61]/20"
                      : "border-white group-hover:border-[#4d2d61]/20 group-hover:shadow-[#4d2d61]/10"
                  }`}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = Avatar;
                  }}
                />
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-[#4d2d61] to-[#7b4397] shadow-[#4d2d61]/20"
                    : "bg-gradient-to-r from-gray-400 to-gray-500 group-hover:from-[#4d2d61] group-hover:to-[#7b4397]"
                }`}
              >
                {displayName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </Suspense>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h3
              className={`text-sm font-bold truncate transition-all duration-300 ${
                isActive
                  ? "text-[#4d2d61]"
                  : "text-gray-800 group-hover:text-[#4d2d61]"
              }`}
            >
              {displayName}
            </h3>
            <span
              className={`text-xs transition-all duration-300 ${
                isActive
                  ? "text-[#4d2d61]/70"
                  : "text-gray-400 group-hover:text-[#4d2d61]/60"
              }`}
            >
              {dateHandler(chat?.lastMessage?.createdAt)}
            </span>
          </div>
          <p
            className={`text-xs truncate transition-all duration-300 ${
              isActive
                ? "text-gray-600"
                : "text-gray-500 group-hover:text-gray-600"
            }`}
          >
            {chat?.lastMessage?.content ||
              chat?.lastMessage?.message ||
              "No messages yet"}
          </p>
        </div>
      </motion.div>
    );
  }
);

export default ConversationItem;
