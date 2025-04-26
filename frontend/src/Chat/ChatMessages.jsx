// "use client";

// import { createContext, useContext, useState, useEffect, useMemo } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { createSelector } from "@reduxjs/toolkit";
// import { setActiveConversation } from "../features/Slice/ChatSlice/chatSlice";
// import { connectSocket, disconnectSocket } from "../utils/socket";
// import { checkAuthStatus } from "../features/Slice/authSlice/loginSlice";

// // Create the context with default values
// const ChatContext = createContext();

// // Memoized base selector
// const selectAuthState = (state) => state.auth;

// // Memoized derived selectors
// const selectAuthData = createSelector([selectAuthState], (auth) => ({
//   user: auth?.user || null,
//   isAuthenticated: auth?.isAuthenticated || false,
// }));

// // Get JWT from cookies
// const getJwtFromCookies = () => {
//   const jwt = document.cookie
//     .split("; ")
//     .find((row) => row.startsWith("jwt="))
//     ?.split("=")[1];

//   console.log("JWT from cookies:", jwt ? "Found" : "Not found");
//   return jwt;
// };

// // Create a provider component
// export const ChatProvider = ({ children }) => {
//   const dispatch = useDispatch();
//   const [activeChat, setActiveChatState] = useState(null);
//   const [socketInitialized, setSocketInitialized] = useState(false);

//   // Use single memoized selector to get both values
//   const { user: currentUser, isAuthenticated } = useSelector(selectAuthData);

//   // Check auth status on mount
//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         console.log("Checking auth status...");
//         const result = await dispatch(checkAuthStatus()).unwrap();
//         console.log("Auth status result:", result);
//       } catch (error) {
//         console.error("Auth check failed:", error);
//       }
//     };
//     checkAuth();
//   }, [dispatch]);

//   // Handle socket connection
//   useEffect(() => {
//     console.log("Socket effect triggered. Auth state:", { isAuthenticated });

//     const initializeSocket = () => {
//       const jwt = getJwtFromCookies();
//       console.log("Attempting socket connection. JWT exists:", !!jwt);

//       if (isAuthenticated && jwt) {
//         console.log("Connecting socket with JWT");
//         connectSocket(jwt);
//         setSocketInitialized(true);
//       } else {
//         if (socketInitialized) {
//           console.log("Disconnecting socket - no auth");
//           disconnectSocket();
//           setSocketInitialized(false);
//         }
//       }
//     };

//     // Small delay to ensure cookies are set
//     const timeoutId = setTimeout(initializeSocket, 500);

//     return () => {
//       clearTimeout(timeoutId);
//       if (socketInitialized) {
//         console.log("Cleanup: disconnecting socket");
//         disconnectSocket();
//         setSocketInitialized(false);
//       }
//     };
//   }, [isAuthenticated, socketInitialized]);

//   // Memoize handler function
//   const handleSetActiveChat = useMemo(
//     () => (chat) => {
//       if (!chat) return;
//       setActiveChatState(chat);
//       dispatch(setActiveConversation(chat));
//     },
//     [dispatch]
//   );

//   // Memoize context value with stable reference
//   const contextValue = useMemo(
//     () => ({
//       currentUser,
//       isAuthenticated,
//       activeChat,
//       setActiveChat: handleSetActiveChat,
//     }),
//     [currentUser, isAuthenticated, activeChat, handleSetActiveChat]
//   );

//   return (
//     <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
//   );
// };

// // Custom hook to use chat context
// export const useChat = () => {
//   const context = useContext(ChatContext);
//   if (!context) {
//     throw new Error("useChat must be used within a ChatProvider");
//   }
//   return context;
// };

"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FiDownload, FiFile } from "react-icons/fi";
import { useChat } from "../context/chat-context";

const MessageBubble = ({ message, isSender }) => {
  const getMessageContent = () => {
    switch (message.type) {
      case "text":
        return <p>{message.content}</p>;

      case "image":
        return (
          <img
            src={message.content}
            alt="Message"
            className="max-w-[300px] rounded-lg"
            loading="lazy"
          />
        );

      case "file":
        return (
          <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg">
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
              className="p-2 hover:bg-gray-200 rounded-full"
              title="Download File"
            >
              <FiDownload className="w-4 h-4" />
            </a>
          </div>
        );

      default:
        return <p className="text-red-500">Unknown message type</p>;
    }
  };

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isSender ? "bg-[#4D2D61] text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {getMessageContent()}
        <div
          className={`text-xs mt-1 ${
            isSender ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {format(new Date(message.createdAt), "p", { locale: ar })}
        </div>
      </div>
    </div>
  );
};

const ChatMessages = () => {
  const messagesEndRef = useRef(null);
  const { messages = [], status } = useSelector((state) => state.chat);
  const { currentUser } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#4D2D61]"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble
          key={message._id || message.id}
          message={message}
          isSender={message.senderId === currentUser?._id}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
