// frontend/src/context/chat-context.jsx

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
  emitMessage as emitSocketMessage, // Renamed for clarity: this is the utility from utils/socket.js
  emitTyping,
  emitStopTyping,
  // --- FIX: Add missing exports for event listeners ---
  onMessage,
  onTyping,
  onStopTyping,
  onOnlineUsers,
  onMessageDeleted, // Import the new handler
  // --- END FIX ---
  emitDeleteMessage,
  joinConversation as joinSocketConversation, // Renamed for clarity: this is the utility from utils/socket.js
} from "../utils/socket"; // Make sure this path is correct
import {
  addMessage,
  setIsTyping,
  setActiveConversation,
  setOnlineUsers,
  handleMessageDeleted,
} from "../features/Slice/ChatSlice/chatSlice";
import { toast } from "react-hot-toast"; // Assuming you have toast for notifications

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [socketInitialized, setSocketInitialized] = useState(false);
  const user = useSelector((state) => state.login?.user); // Get current logged-in user
  const isAuthenticated = useSelector((state) => state.login?.isAuthenticated);
  const activeConversation = useSelector(
    (state) => state.chat?.activeConversation
  );

  // --- Socket Initialization and Connection Management ---
  useEffect(() => {
    let mounted = true; // To prevent state updates on unmounted component
    let socketInitTimeoutId = null; // For clearing retry timeouts

    const initializeSocket = async (retries = 0) => {
      // Don't connect if not authenticated, user ID missing, or already initialized
      if (!isAuthenticated || !user?._id || socketInitialized) {
        if (!isAuthenticated)
          console.warn("ChatContext: Not authenticated, skipping socket init.");
        if (!user?._id)
          console.warn("ChatContext: User ID missing, skipping socket init.");
        if (socketInitialized)
          console.log(
            "ChatContext: Socket already initialized, skipping redundant init."
          );
        return;
      }

      try {
        console.log(
          `ChatContext: Attempting to initialize socket (Attempt ${
            retries + 1
          })...`
        );
        const socket = await connectSocket(); // connectSocket returns a Promise

        if (!mounted) {
          console.log(
            "ChatContext: Component unmounted during socket initialization, disconnecting."
          );
          disconnectSocket();
          return;
        }

        if (socket) {
          console.log("ChatContext: Socket initialized successfully.");
          setSocketInitialized(true); // Mark as initialized on success
          // No need to clear internal timeouts here, as connectSocket manages its own retry logic now.
        }
      } catch (error) {
        console.error("ChatContext: Socket initialization failed:", error);
        const maxRetries = 5;
        const retryDelay = 2000;
        if (mounted && retries < maxRetries) {
          console.log(
            `ChatContext: Retrying socket connection (${
              retries + 1
            }/${maxRetries})...`
          );
          socketInitTimeoutId = setTimeout(
            () => initializeSocket(retries + 1),
            retryDelay
          );
        } else if (retries >= maxRetries) {
          console.error(
            "ChatContext: Max retry attempts reached for socket connection."
          );
        }
      }
    };

    // Initial call to start the socket connection process
    initializeSocket();

    // Cleanup function for this useEffect:
    return () => {
      mounted = false; // Mark component as unmounted
      if (socketInitTimeoutId) clearTimeout(socketInitTimeoutId); // Clear any pending retry attempts
      console.log(
        "ChatContext: Cleaning up socket initialization effect (disconnecting socket)."
      );
      disconnectSocket(); // Ensure socket is disconnected when component unmounts or dependencies change
      setSocketInitialized(false); // Reset initialization state
    };
  }, [isAuthenticated, user?._id]); // Dependencies for re-running the effect

  // --- Socket Event Listeners Setup ---
  useEffect(() => {
    // Only set up listeners if the socket has been successfully initialized
    if (!socketInitialized) {
      console.log(
        "ChatContext: Socket not initialized, skipping event listener setup."
      );
      return;
    }

    console.log("ChatContext: Setting up socket event listeners...");
    const cleanupFunctions = [];
    let typingTimeout = null;
    let onlineUsersDebounceTimeout = null;

    // Handler for incoming messages from the socket
    const handleMessage = (message) => {
      console.log(
        "ChatContext: Received 'receive message' from socket:",
        message
      );
      // Dispatch message to add it to the Redux state.
      // The `addMessage` reducer handles adding to message list & updating conversation's lastMessage.
      dispatch(addMessage(message));

      // Optional: Show a toast notification for new messages in non-active conversations
      if (
        message.sender._id !== user?._id &&
        message.conversation?._id !== activeConversation?.id
      ) {
        toast.success(
          `New message from ${
            message.sender.fullName || message.sender.username
          } in ${message.conversation.name || "a chat"}!`,
          {
            duration: 3000,
          }
        );
      }
    };

    // Handler for typing indicators
    const handleTyping = (data) => {
      // data will be { conversationId, userId }
      const { conversationId, userId } = data;
      console.log(
        `ChatContext: Received 'typing' for convo ${conversationId} from user ${userId}`
      );
      // For simplicity, we'll just set a global typing indicator if any user is typing in the active chat.
      // For more complex UI, you'd track typing users per conversation.
      if (activeConversation?.id === conversationId && user?._id !== userId) {
        dispatch(setIsTyping(true));
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          dispatch(setIsTyping(false));
          typingTimeout = null; // Clear the ref
        }, 3000); // Hide typing indicator after 3 seconds of no activity
      }
    };

    // Handler for stopping typing indicators
    const handleStopTyping = (data) => {
      // data will be { conversationId, userId }
      const { conversationId, userId } = data;
      console.log(
        `ChatContext: Received 'stop typing' for convo ${conversationId} from user ${userId}`
      );
      if (activeConversation?.id === conversationId && user?._id !== userId) {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
          typingTimeout = null;
        }
        dispatch(setIsTyping(false));
      }
    };

    // Handler for online users list updates (debounced)
    const handleOnlineUsers = (users) => {
      console.log(
        "ChatContext: Received 'get-online-users'. Total online:",
        users.length
      );
      if (onlineUsersDebounceTimeout) clearTimeout(onlineUsersDebounceTimeout);
      onlineUsersDebounceTimeout = setTimeout(() => {
        dispatch(setOnlineUsers(users));
        onlineUsersDebounceTimeout = null;
      }, 1000); // Debounce to prevent very rapid Redux updates
    };

    // Handler for message deletion confirmation/broadcast
    const handleMessageDeletedInContext = (messageId) => {
      console.log("ChatContext: Received 'message deleted' for ID:", messageId);
      dispatch(handleMessageDeleted({ messageId })); // Dispatch to slice to remove message
    };

    // Register all event handlers using the `registerEventHandler` utility from `utils/socket.js`
    cleanupFunctions.push(
      onMessage(handleMessage), // Listens for 'receive message'
      onTyping(handleTyping),
      onStopTyping(handleStopTyping),
      onOnlineUsers(handleOnlineUsers), // Listens for 'get-online-users'
      onMessageDeleted(handleMessageDeletedInContext) // Listens for 'message deleted'
    );

    // Cleanup function for this useEffect:
    return () => {
      console.log("ChatContext: Cleaning up socket event listeners.");
      cleanupFunctions.forEach((fn) => fn()); // Execute all cleanup functions for registered events
      if (typingTimeout) clearTimeout(typingTimeout);
      if (onlineUsersDebounceTimeout) clearTimeout(onlineUsersDebounceTimeout);
    };
  }, [socketInitialized, dispatch, user?._id]); // Removed activeConversation?.id from dependencies

  // --- Wrapped Socket Emitters for Context API ---
  // This `sendMessage` is provided via context to components like `ChatInput.jsx`.
  const sendMessage = useCallback(
    async (messagePayload) => {
      if (!socketInitialized) {
        console.warn(
          "ChatContext: sendMessage called but socket not initialized. Cannot emit."
        );
        toast.error("Chat is not connected. Please try again.");
        return false;
      }
      try {
        console.log(
          "ChatContext: Calling emitSocketMessage utility with payload:",
          messagePayload
        );
        const success = await emitSocketMessage(messagePayload); // Calls the function in utils/socket.js
        if (!success) {
          throw new Error(
            "Failed to send message via socket utility (no server acknowledgment)."
          );
        }
        console.log("ChatContext: emitSocketMessage successfully executed.");
        return true;
      } catch (error) {
        console.error("ChatContext: Error sending message via socket:", error);
        // Toast message already handled by ChatInput, but can be added here if this is the only call point
        return false;
      }
    },
    [socketInitialized] // Dependency: re-create if socketInitialized changes
  );

  // This `deleteMessage` is provided via context.
  const deleteMessage = useCallback(
    async (messageId, conversationId) => {
      if (!socketInitialized || !messageId || !conversationId) {
        console.warn(
          "ChatContext: deleteMessage called with invalid args or uninitialized socket."
        );
        return false;
      }
      try {
        console.log("ChatContext: Calling emitDeleteMessage utility.");
        const success = await emitDeleteMessage({
          messageId,
          conversationId,
          deletedBy: user?._id,
        });
        if (!success) {
          throw new Error("Failed to emit delete message via socket utility.");
        }
        console.log("ChatContext: emitDeleteMessage successfully executed.");
        return true;
      } catch (error) {
        console.error("ChatContext: Error deleting message via socket:", error);
        // Optionally add toast here if it's the primary call site
        return false;
      }
    },
    [socketInitialized, user?._id]
  );

  // This `notifyTyping` is provided via context.
  const notifyTyping = useCallback(
    (conversationId) => {
      if (!socketInitialized || !conversationId) return;
      try {
        emitTyping(conversationId);
      } catch (error) {
        console.error("ChatContext: Typing notification failed:", error);
      }
    },
    [socketInitialized]
  );

  // This `joinConversation` is provided via context.
  const joinConversation = useCallback(
    (conversationId) => {
      if (!socketInitialized || !conversationId) return;
      try {
        joinSocketConversation(conversationId); // Calls the utility function
      } catch (error) {
        console.error(
          "ChatContext: Failed to join socket conversation room:",
          error
        );
      }
    },
    [socketInitialized]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      currentUser: user,
      activeChat: activeConversation,
      sendMessage, // The wrapped sendMessage function for components
      notifyTyping,
      deleteMessage,
      setActiveConversation: (conversation) =>
        dispatch(setActiveConversation(conversation)), // Direct dispatch for convenience
      socketInitialized, // Expose socket initialization status
      joinConversation, // Expose joinConversation
    }),
    [
      user,
      sendMessage, // Dependency for memoization
      notifyTyping,
      deleteMessage,
      activeConversation,
      dispatch,
      socketInitialized,
      joinConversation, // Dependency for memoization
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to consume the ChatContext
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
