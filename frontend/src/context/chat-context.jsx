"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import {
  connectSocket,
  disconnectSocket,
  sendMessage as emitMessage,
  emitTyping,
  onMessage,
  onTyping,
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

// Memoized selectors
const selectUser = (state) => state.login?.user ?? null;
const selectIsAuthenticated = (state) => state.login?.isAuthenticated ?? false;
const selectActiveConversation = (state) =>
  state.chat?.activeConversation ?? null;

export const ChatProvider = ({ children }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const activeConversation = useSelector(selectActiveConversation);

  // Authentication and user data initialization
  useEffect(() => {
    let mounted = true;

    const initializeAuthAndUser = async () => {
      try {
        console.log("Starting auth initialization...");
        const authResult = await dispatch(checkAuthStatus()).unwrap();
        console.log("Auth check result:", authResult);

        if (!mounted) return;

        if (authResult.isAuthenticated) {
          console.log("Authentication successful, fetching user data...");
          const userData = await dispatch(fetchUserData()).unwrap();

          if (!mounted) return;

          if (userData) {
            console.log("User data loaded successfully:", { id: userData._id });

            // Force a delay before trying to connect socket
            // This helps ensure cookies and state are fully processed
            setTimeout(async () => {
              if (!mounted) return;
              try {
                await connectSocket();
                console.log("Socket connected after authentication");
              } catch (err) {
                console.error(
                  "Failed to connect socket after successful auth:",
                  err
                );
              }
            }, 1000);
          } else {
            console.error("User data is null after successful fetch");
            disconnectSocket();
          }
        } else {
          console.log("Not authenticated, cleaning up...");
          disconnectSocket();
        }
      } catch (error) {
        if (mounted) {
          console.error("Auth initialization failed:", error);
          disconnectSocket();
        }
      }
    };

    initializeAuthAndUser();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  // Socket connection management
  useEffect(() => {
    let mounted = true;
    let socketCleanup = null;

    const initializeSocket = async () => {
      // Ensure we have both authentication and user data
      if (!isAuthenticated) {
        console.log("Skipping socket - not authenticated");
        return;
      }

      if (!user?._id) {
        console.log("Skipping socket - no user data");
        return;
      }

      try {
        console.log("Initializing socket for user:", { id: user._id });
        await connectSocket();

        if (!mounted) return;

        const cleanupFunctions = [];

        // Message handler
        cleanupFunctions.push(
          onMessage((message) => {
            if (mounted) {
              console.log("Message received:", message);
              dispatch(addMessage(message));
            }
          })
        );

        // Typing handler
        cleanupFunctions.push(
          onTyping(({ conversationId, userId }) => {
            if (
              mounted &&
              activeConversation?._id === conversationId &&
              userId !== user._id
            ) {
              dispatch(setIsTyping(true));
              setTimeout(() => dispatch(setIsTyping(false)), 3000);
            }
          })
        );

        // Online users handler
        cleanupFunctions.push(
          onOnlineUsers((users) => {
            if (mounted) {
              console.log("Online users updated:", users);
              dispatch(setOnlineUsers(users));
            }
          })
        );

        socketCleanup = () => {
          console.log("Cleaning up socket connection for user:", user._id);
          cleanupFunctions.forEach((cleanup) => cleanup?.());
          disconnectSocket();
        };
      } catch (error) {
        if (mounted) {
          console.error("Socket initialization failed:", error);
          disconnectSocket();
        }
      }
    };

    // Initialize socket connection
    initializeSocket();

    // Cleanup function
    return () => {
      mounted = false;
      if (socketCleanup) {
        socketCleanup();
      }
    };
  }, [dispatch, isAuthenticated, user?._id, activeConversation]);

  const sendMessage = useCallback(
    (message) => {
      if (!message || !isAuthenticated) return;
      try {
        emitMessage(message);
      } catch (error) {
        console.error("Send message failed:", error);
      }
    },
    [isAuthenticated]
  );

  const notifyTyping = useCallback(
    (conversationId) => {
      if (!conversationId || !isAuthenticated) return;
      try {
        emitTyping(conversationId);
      } catch (error) {
        console.error("Typing notification failed:", error);
      }
    },
    [isAuthenticated]
  );

  const value = useMemo(
    () => ({
      sendMessage,
      notifyTyping,
      activeConversation,
      setActiveConversation: (conversation) =>
        dispatch(setActiveConversation(conversation)),
    }),
    [sendMessage, notifyTyping, activeConversation, dispatch]
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
