"use client";

import { useMemo } from "react";
import { dateHandler } from "../utils/Date";
import Avatar from "../assets/defaultAvatar.png";
import { isValidImageUrl, getAvatarUrl } from "../utils/imageUtils";
import React, { Suspense } from "react";

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
            chat.picture || "https://image.pngaaa.com/78/6179078-middle.png",
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
      <div
        className={`relative flex items-center p-3 cursor-pointer hover:bg-gray-100 transition-colors ${
          isActive ? "bg-[#4D2D61]/10" : ""
        }`}
        onClick={() => onConversationClick(chat)}
      >
        <div className="relative flex-shrink-0 mr-3">
          <Suspense
            fallback={
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
                {displayName?.[0]?.toUpperCase() || "?"}
              </div>
            }
          >
            {isValidImageUrl(displayPicture) ? (
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  src={displayPicture}
                  alt={displayName}
                  loading="lazy"
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = Avatar;
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
                {displayName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </Suspense>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold truncate text-[#4D2D61]">
              {displayName}
            </h3>
            <span className="text-xs text-gray-500">
              {dateHandler(chat?.lastMessage?.createdAt)}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {chat?.lastMessage?.content ||
              chat?.lastMessage?.message ||
              "No messages yet"}
          </p>
        </div>
      </div>
    );
  }
);

export default ConversationItem;
