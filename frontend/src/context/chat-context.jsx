"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  connectSocket,
  disconnectSocket,
  sendMessage as emitMessage,
  emitTyping,
  onMessage,
  onTyping,
  onStopTyping,
  onOnlineUsers,
  emitDeleteMessage,
} from "../utils/socket";
import {
  addMessage,
  updateConversationLastMessage,
  setIsTyping,
  setActiveConversation,
  setOnlineUsers,
  handleMessageDeleted,
} from "../features/Slice/ChatSlice/chatSlice";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [socketInitialized, setSocketInitialized] = useState(false);
  const user = useSelector((state) => state.login?.user);
  const isAuthenticated = useSelector((state) => state.login?.isAuthenticated);
  const activeConversation = useSelector(
    (state) => state.chat?.activeConversation
  );

  // Socket initialization with connection management
  useEffect(() => {
    let mounted = true;
    let socketInitAttempt = null;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 2000;
    const connectionCheckInterval = 30000;
    const pingInterval = 15000;

    const initializeSocket = async () => {
      if (!isAuthenticated || !user?._id || socketInitialized) {
        return;
      }

      try {
        console.log("Attempting to initialize socket...");
        const socket = await connectSocket();

        if (!mounted) {
          disconnectSocket();
          return;
        }

        if (socket) {
          console.log("Socket initialized successfully");
          setSocketInitialized(true);
          retryCount = 0;

          const ping = setInterval(() => {
            if (socket?.connected) {
              socket.emit("ping");
            }
          }, pingInterval);

          const checkConnection = setInterval(() => {
            if (!socket?.connected) {
              console.log("Socket disconnected, attempting to reconnect...");
              disconnectSocket();
              initializeSocket();
            }
          }, connectionCheckInterval);

          return () => {
            clearInterval(ping);
            clearInterval(checkConnection);
          };
        }
      } catch (error) {
        console.error("Socket initialization failed:", error);
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Retrying socket connection (${retryCount}/${maxRetries})...`
          );
          socketInitAttempt = setTimeout(initializeSocket, retryDelay);
        } else if (retryCount >= maxRetries) {
          console.error("Max retry attempts reached for socket connection");
        }
      }
    };

    const cleanup = initializeSocket();

    return () => {
      mounted = false;
      if (socketInitAttempt) clearTimeout(socketInitAttempt);
      disconnectSocket();
      setSocketInitialized(false);
      if (typeof cleanup === "function") cleanup();
    };
  }, [isAuthenticated, user?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socketInitialized) return;

    console.log("Setting up socket event listeners...");
    const cleanupFunctions = [];
    const messageBatch = [];
    let batchTimeout = null;
    const BATCH_DELAY = 1000;
    let typingTimeout = null;
    let onlineTimeout = null;

    const processMessageBatch = () => {
      if (messageBatch.length > 0) {
        dispatch(addMessage(messageBatch));
        messageBatch.length = 0;
      }
    };

    const handleMessage = (message) => {
      messageBatch.push(message);
      if (batchTimeout) clearTimeout(batchTimeout);
      batchTimeout = setTimeout(processMessageBatch, BATCH_DELAY);
    };

    const handleTyping = (status) => {
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        dispatch(setIsTyping(false));
      }, 3000);
      dispatch(setIsTyping(status));
    };

    const handleOnlineUsers = (users) => {
      if (onlineTimeout) clearTimeout(onlineTimeout);
      onlineTimeout = setTimeout(() => {
        dispatch(setOnlineUsers(users));
      }, 1000);
    };

    const handleMessageDeleted = (data) => {
      dispatch(handleMessageDeleted(data));
    };

    cleanupFunctions.push(
      onMessage(handleMessage),
      onTyping(handleTyping),
      onStopTyping(handleTyping),
      onOnlineUsers(handleOnlineUsers)
    );

    if (window.socket) {
      window.socket.on("message deleted", handleMessageDeleted);
      cleanupFunctions.push(() => {
        window.socket.off("message deleted", handleMessageDeleted);
      });
    }

    return () => {
      cleanupFunctions.forEach((fn) => fn());
      if (typingTimeout) clearTimeout(typingTimeout);
      if (onlineTimeout) clearTimeout(onlineTimeout);
      if (batchTimeout) clearTimeout(batchTimeout);
    };
  }, [socketInitialized, dispatch]);

  const sendMessage = useCallback(
    (message) => {
      if (!socketInitialized || !message) return;
      try {
        emitMessage(message);
      } catch (error) {
        console.error("Send message failed:", error);
      }
    },
    [socketInitialized]
  );

  const deleteMessage = useCallback(
    (messageId, conversationId) => {
      if (!socketInitialized || !messageId || !conversationId) return;
      try {
        emitDeleteMessage({ messageId, conversationId });
      } catch (error) {
        console.error("Delete message failed:", error);
      }
    },
    [socketInitialized]
  );

  const notifyTyping = useCallback(
    (conversationId) => {
      if (!socketInitialized || !conversationId) return;
      try {
        emitTyping(conversationId);
      } catch (error) {
        console.error("Typing notification failed:", error);
      }
    },
    [socketInitialized]
  );

  const value = useMemo(
    () => ({
      currentUser: user,
      activeChat: activeConversation,
      sendMessage,
      notifyTyping,
      deleteMessage,
      setActiveConversation: (conversation) =>
        dispatch(setActiveConversation(conversation)),
      socketInitialized,
    }),
    [
      user,
      sendMessage,
      notifyTyping,
      deleteMessage,
      activeConversation,
      dispatch,
      socketInitialized,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
