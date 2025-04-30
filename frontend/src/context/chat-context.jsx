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
} from "../utils/socket";
import {
  addMessage,
  setIsTyping,
  setActiveConversation,
  setOnlineUsers,
} from "../features/Slice/ChatSlice/chatSlice";
import { checkAuthStatus } from "../features/Slice/authSlice/loginSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [socketInitialized, setSocketInitialized] = useState(false);
  const user = useSelector((state) => state.login?.user);
  const isAuthenticated = useSelector((state) => state.login?.isAuthenticated);
  const activeConversation = useSelector(
    (state) => state.chat?.activeConversation
  );

  // Socket initialization
  useEffect(() => {
    let mounted = true;
    let socketInitAttempt = null;
    let retryCount = 0;
    const maxRetries = 3;

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
          retryCount = 0; // Reset retry count on successful connection
        }
      } catch (error) {
        console.error("Socket initialization failed:", error);
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Retrying socket connection (${retryCount}/${maxRetries})...`
          );
          socketInitAttempt = setTimeout(initializeSocket, 5000);
        } else if (retryCount >= maxRetries) {
          console.error("Max retry attempts reached for socket connection");
        }
      }
    };

    initializeSocket();

    return () => {
      mounted = false;
      if (socketInitAttempt) {
        clearTimeout(socketInitAttempt);
      }
      disconnectSocket();
      setSocketInitialized(false);
    };
  }, [isAuthenticated, user?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socketInitialized) return;

    console.log("Setting up socket event listeners...");
    const cleanupFunctions = [];

    try {
      // Message handler
      cleanupFunctions.push(
        onMessage((message) => {
          console.log("Message received:", message);
          dispatch(addMessage(message));
        })
      );

      // Typing handlers
      cleanupFunctions.push(
        onTyping(({ conversationId, userId }) => {
          if (
            activeConversation?.id === conversationId &&
            userId !== user?._id
          ) {
            dispatch(setIsTyping(true));
          }
        })
      );

      cleanupFunctions.push(
        onStopTyping(({ conversationId, userId }) => {
          if (
            activeConversation?.id === conversationId &&
            userId !== user?._id
          ) {
            dispatch(setIsTyping(false));
          }
        })
      );

      // Online users handler
      cleanupFunctions.push(
        onOnlineUsers((users) => {
          console.log("Online users updated:", users);
          dispatch(setOnlineUsers(users));
        })
      );
    } catch (error) {
      console.error("Failed to setup socket listeners:", error);
    }

    return () => {
      console.log("Cleaning up socket listeners...");
      cleanupFunctions.forEach((cleanup) => cleanup?.());
    };
  }, [socketInitialized, dispatch, user?._id, activeConversation?.id]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await dispatch(checkAuthStatus()).unwrap();
        if (authResult.isAuthenticated) {
          await dispatch(fetchUserData()).unwrap();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };

    checkAuth();
  }, [dispatch]);

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
      setActiveConversation: (conversation) =>
        dispatch(setActiveConversation(conversation)),
      socketInitialized,
    }),
    [
      user,
      sendMessage,
      notifyTyping,
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
