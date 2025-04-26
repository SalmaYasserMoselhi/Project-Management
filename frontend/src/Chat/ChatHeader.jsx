// "use client";
// import { MoreVertical } from "lucide-react";

// function ChatHeader({ user }) {
//   return (
//     <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
//       <div className="flex items-center">
//         {user.avatar ? (
//           <img
//             src={user.avatar}
//             alt={user.name}
//             className="w-10 h-10 rounded-full mr-3 object-cover"
//             onError={(e) => (e.target.src = "/fallback-avatar.png")} // صورة افتراضية عند الخطأ
//           />
//         ) : (
//           <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold bg-gray-400 mr-3">
//             {user.name.charAt(0)}
//           </div>
//         )}
//         <div>
//           <h2 className="text-md font-semibold">{user.name}</h2>
//           <p className="text-xs text-gray-500">last seen {user.lastSeen}</p>
//         </div>
//       </div>
//       <div className="p-2 rounded-b-md  hover:bg-gray-100">
//         <MoreVertical className="h-5 w-5 text-gray-500" />
//       </div>
//     </div>
//   );
// }

// export default ChatHeader;

"use client";
import { useSelector, useDispatch } from "react-redux";
import { FiPhone, FiVideo, FiMoreVertical } from "react-icons/fi";
import { initiateCall } from "../utils/socket";
import {
  setCurrentCall,
  fetchUserById,
} from "../features/Slice/ChatSlice/chatSlice";
import { useChat } from "../context/chat-context";
import { useMemo, useEffect } from "react";
import Avatar from "../assets/defaultAvatar.png";

function ChatHeader({ user }) {
  const dispatch = useDispatch();
  const { currentUser } = useChat();
  const { currentCall, userCache } = useSelector((state) => state.chat);

  // محاولة تحميل بيانات المستخدم إذا كان المعرف متاحًا ولكن البيانات ناقصة
  useEffect(() => {
    if (!user) return;

    // التأكد من أن معرف المستخدم هو نص وليس كائن
    const userId =
      typeof user.id === "string"
        ? user.id
        : user._id && typeof user._id === "string"
        ? user._id
        : null;

    // إذا كان لدينا معرف المستخدم ولكن ليس لدينا بيانات كافية
    if (userId && !user.otherUser && !user.isGroup) {
      console.log(`Attempting to fetch data for user ${userId} in ChatHeader`);
      dispatch(fetchUserById(userId)).catch((error) => {
        console.error("Error fetching user data:", error);
      });
    } else if (user.id && typeof user.id !== "string") {
      console.error("Invalid user ID format:", user.id);
    }
  }, [user, dispatch]);

  // استخراج بيانات المستخدم الآخر من كائن المحادثة النشطة
  const otherUser = useMemo(() => {
    if (!user) {
      console.log("No user data available for ChatHeader");
      return {
        id: null,
        name: "Chat",
        avatar: null,
        isOnline: false,
      };
    }

    // التعامل مع المحادثات الجماعية
    if (user.isGroup) {
      return {
        id: user.id,
        name: user.name || "Group Chat",
        avatar: user.picture || user.avatar,
        isOnline: false,
        isGroup: true,
      };
    }

    // محاولة استخدام البيانات المخزنة في مخزن Redux
    if (user.id && userCache && userCache[user.id]) {
      const cachedUser = userCache[user.id];
      console.log(
        `Using cached user data for ${user.id} in ChatHeader:`,
        cachedUser
      );

      return {
        id: cachedUser._id,
        name:
          cachedUser.fullName ||
          `${cachedUser.firstName || ""} ${cachedUser.lastName || ""}`.trim() ||
          cachedUser.username ||
          cachedUser.email ||
          "Chat",
        avatar: cachedUser.avatar,
        isOnline: cachedUser.isOnline || false,
      };
    }

    // استخدام معلومات المستخدم الآخر من الكائن المحادثة إذا كانت متاحة
    if (user.otherUser) {
      const otherUserData = user.otherUser;
      console.log("Using otherUser data from conversation:", otherUserData);

      return {
        id: otherUserData._id || user.id,
        name:
          otherUserData.fullName ||
          `${otherUserData.firstName || ""} ${
            otherUserData.lastName || ""
          }`.trim() ||
          otherUserData.username ||
          otherUserData.email ||
          user.name ||
          "Chat",
        avatar: otherUserData.avatar,
        isOnline: otherUserData.isOnline || false,
      };
    }

    // استخدام البيانات المتاحة في المحادثة
    return {
      id: user.id,
      name: user.name && user.name !== "conversation name" ? user.name : "Chat",
      avatar: user.picture || user.avatar,
      isOnline: user.isOnline || false,
    };
  }, [user, userCache]);

  const handleCall = (type) => {
    if (!otherUser.id) {
      console.error("Cannot initiate call: Missing recipient ID");
      alert("Cannot initiate call: Contact information unavailable");
      return;
    }

    if (currentCall) {
      alert("There is already an active call");
      return;
    }

    const callData = {
      recipientId: otherUser.id,
      recipientName: otherUser.name,
      recipientAvatar: otherUser.avatar,
      senderId: currentUser?._id,
      senderName:
        currentUser?.firstName && currentUser?.lastName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser?.name || "User",
      senderAvatar: currentUser?.avatar,
      type, // 'audio' or 'video'
    };

    dispatch(
      setCurrentCall({
        ...callData,
        status: "initiating",
      })
    );

    initiateCall(callData);
  };

  console.log("ChatHeader rendering with user:", user, "otherUser:", otherUser);

  return (
    <div className="bg-white border-b p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {otherUser.avatar ? (
          <img
            src={otherUser.avatar}
            alt={otherUser.name}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.target.src = Avatar;
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
            {otherUser.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <h3 className="font-medium text-[#4D2D61]">{otherUser.name}</h3>
          {otherUser.isOnline && (
            <p className="text-xs text-green-500">Online</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleCall("audio")}
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="Voice Call"
          disabled={!otherUser.id || otherUser.isGroup}
        >
          <FiPhone className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleCall("video")}
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="Video Call"
          disabled={!otherUser.id || otherUser.isGroup}
        >
          <FiVideo className="w-5 h-5" />
        </button>

        <button
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="More"
        >
          <FiMoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
