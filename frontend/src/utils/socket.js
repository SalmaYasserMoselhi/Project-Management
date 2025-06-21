// frontend/src/utils/socket.js

import { io } from "socket.io-client";
// Make sure this import path is correct for your Redux store
// For `src/features/Slice/ChatSlice/chatSlice.js`, the path to store is "../../Store/Store"
// For `src/utils/socket.js`, if store is in `src/Store/Store`, it should be `../Store/Store`
// Based on your current file structure context: "src/features/Slice/ChatSlice/chatSlice.js" needs "../../Store/Store"
// And this file "src/utils/socket.js" likely needs "../features/Store/Store" if it's placed in `src/utils`
// !!! IMPORTANT: ADJUST THIS PATH based on where your Redux store is relative to utils/socket.js !!!
import { store } from "../features/Store/Store";

let socket = null; // Module-scoped socket instance
let reconnectTimer = null; // Timer for manual reconnection attempts
const SOCKET_URL = "http://localhost:3000"; // !!! Ensure this matches your backend Socket.IO server URL !!!
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 3000; // Milliseconds between reconnection attempts
const MAX_RECONNECT_DELAY = 30000; // Maximum delay for exponential backoff (30 seconds)
const INITIAL_RECONNECT_DELAY = 1000; // Initial delay for exponential backoff

// Helper function to get the current user's ID from the Redux store
const getUserDataFromStore = () => {
  try {
    // Ensure the store is available and contains the login slice with user._id
    if (
      store &&
      store.getState() &&
      store.getState().login &&
      store.getState().login.user
    ) {
      return store.getState().login.user._id;
    }
  } catch (error) {
    console.error("SocketUtil: Error getting user ID from Redux store:", error);
  }
  return null;
};

// Helper function to get the full current user object from the Redux store
const getCurrentUserFromStore = () => {
  try {
    if (
      store &&
      store.getState() &&
      store.getState().login &&
      store.getState().login.user
    ) {
      return store.getState().login.user;
    }
  } catch (error) {
    console.error(
      "SocketUtil: Error getting current user from Redux store:",
      error
    );
  }
  return null;
};

// Sets up continuous ping/pong to keep the WebSocket connection alive
const setupKeepAlive = (currentSocket) => {
  console.log("SocketUtil: Setting up keep-alive pings.");
  const pingInterval = setInterval(() => {
    if (currentSocket?.connected) {
      currentSocket.emit("ping"); // Emit a custom 'ping' event
    } else {
      console.warn(
        "SocketUtil: Socket disconnected during keep-alive ping. Attempting reconnect."
      );
      handleReconnect(); // Trigger reconnect if ping fails
      clearInterval(pingInterval); // Stop this interval
    }
  }, 25000); // Send ping every 25 seconds

  // Optional: Also check connection health explicitly
  const checkConnection = setInterval(() => {
    if (currentSocket?.connected) {
      currentSocket.emit("check_connection", { timestamp: Date.now() });
    } else {
      console.warn(
        "SocketUtil: Socket disconnected during connection health check. Attempting reconnect."
      );
      handleReconnect();
      clearInterval(checkConnection);
    }
  }, 60000); // Check connection every minute

  return () => {
    // Cleanup function
    clearInterval(pingInterval);
    clearInterval(checkConnection);
    console.log("SocketUtil: Cleared keep-alive intervals.");
  };
};

// Manages reconnection attempts with exponential backoff
const handleReconnect = (maxAttempts = MAX_RECONNECT_ATTEMPTS) => {
  let attempts = 0;
  let delay = INITIAL_RECONNECT_DELAY;

  const attemptReconnect = async () => {
    if (socket?.connected) {
      // If global `socket` variable is already connected
      console.log(
        "SocketUtil: Socket already reconnected in background. Clearing timer."
      );
      clearTimeout(reconnectTimer);
      reconnectTimer = null; // Clear the timer reference
      return;
    }

    if (attempts >= maxAttempts) {
      console.error(
        `SocketUtil: Failed to reconnect after ${attempts} attempts. Max attempts reached.`
      );
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      return;
    }

    attempts++;
    console.log(`SocketUtil: Reconnection attempt ${attempts}/${maxAttempts}.`);

    try {
      await connectSocket(); // Attempt to re-establish connection
      console.log("SocketUtil: Reconnected successfully.");
      clearTimeout(reconnectTimer);
      reconnectTimer = null; // Clear the timer reference
    } catch (error) {
      console.error("SocketUtil: Reconnection attempt failed:", error.message);
      // Exponential backoff with jitter for better network resilience
      delay = Math.min(delay * 1.5 + Math.random() * 1000, MAX_RECONNECT_DELAY);
      console.log(
        `SocketUtil: Retrying in ${Math.round(delay / 1000)} seconds...`
      );
      reconnectTimer = setTimeout(attemptReconnect, delay);
    }
  };

  // Only start a new reconnect attempt chain if one isn't already active
  if (!reconnectTimer) {
    console.log("SocketUtil: Initiating reconnection sequence.");
    reconnectTimer = setTimeout(attemptReconnect, delay);
  } else {
    console.log("SocketUtil: Reconnection sequence already in progress.");
  }
};

// Ensures a socket connection is active before attempting to emit
const ensureConnection = async () => {
  if (socket?.connected) {
    return true; // Already connected
  }

  console.warn(
    "SocketUtil: Socket not connected. Attempting to establish connection now."
  );
  try {
    await connectSocket(); // Attempt to connect
    return true; // Connection successful
  } catch (error) {
    console.error(
      "SocketUtil: Failed to establish connection for emit:",
      error.message
    );
    return false; // Connection failed
  }
};

// Generic emitter with acknowledgement handling
export const emitWithAck = async (eventName, data, timeout = 5000) => {
  if (!(await ensureConnection())) {
    console.error(
      `SocketUtil: Failed to emit "${eventName}": No active socket connection.`
    );
    return { success: false, error: "No active socket connection" };
  }

  return new Promise((resolve) => {
    // Set a timeout for the acknowledgement from the server
    const timeoutId = setTimeout(() => {
      console.warn(
        `SocketUtil: Acknowledgement timeout for event: "${eventName}".`
      );
      resolve({ success: false, error: "Acknowledgement timeout" });
    }, timeout);

    // Emit the event with a callback for server acknowledgement
    socket.emit(eventName, data, (response) => {
      clearTimeout(timeoutId); // Clear the timeout if ack received in time
      console.log(
        `SocketUtil: Received acknowledgement for "${eventName}":`,
        response
      );
      resolve({ success: true, data: response });
    });
  });
};

// Emits non-critical messages that don't require guaranteed delivery
export const emitVolatile = async (eventName, data) => {
  if (!(await ensureConnection())) {
    console.warn(
      `SocketUtil: Failed to emit volatile "${eventName}": No active socket connection.`
    );
    return false;
  }
  socket.volatile.emit(eventName, data); // Uses volatile flag
  console.log(`SocketUtil: Emitted volatile event "${eventName}".`);
  return true;
};

// Specific emitter for sending chat messages
export const emitMessage = async (messagePayload) => {
  const currentUser = getCurrentUserFromStore();
  if (!currentUser?._id) {
    console.error(
      "SocketUtil: Cannot emit message: Current user ID missing from store."
    );
    return false;
  }

  const messageDataForSocket = {
    content: messagePayload.content, // Keep for backward compatibility
    message: messagePayload.content, // Add 'message' property to match backend schema
    conversationId: messagePayload.conversationId,
    isEmoji: messagePayload.isEmoji || false,
    sender: { _id: currentUser._id }, // Send current user's ID as sender
    // Optionally include a client-generated temporary ID here for local UI updates/matching
    // clientTempId: messagePayload.clientTempId || `temp-${Date.now()}`,
  };

  console.log(
    "SocketUtil: Attempting to emit 'send message' event to server. Payload:",
    messageDataForSocket
  );
  const result = await emitWithAck("send message", messageDataForSocket);

  if (result.success) {
    console.log(
      "SocketUtil: 'send message' emitted successfully and acknowledged by server."
    );
  } else {
    console.error(
      "SocketUtil: Failed to emit 'send message' or received negative acknowledgment:",
      result.error
    );
  }
  return result.success;
};

// Specific emitter for typing indicators
export const emitTyping = async (conversationId) => {
  return emitVolatile("typing", conversationId);
};

// Specific emitter for stopping typing indicators
export const emitStopTyping = async (conversationId) => {
  return emitVolatile("stop typing", conversationId);
};

// Specific emitter for joining a conversation room on the backend
export const joinConversation = async (conversationId) => {
  console.log(
    `SocketUtil: Attempting to join conversation room: ${conversationId}`
  );
  const result = await emitWithAck("join conversation", conversationId);
  if (result.success) {
    console.log(
      `SocketUtil: Successfully joined conversation room: ${conversationId}`
    );
  } else {
    console.error(
      `SocketUtil: Failed to join conversation room ${conversationId}:`,
      result.error
    );
  }
  return result.success;
};

// Specific emitter for deleting messages
export const emitDeleteMessage = async (data) => {
  console.log(
    "SocketUtil: Attempting to emit 'delete message' event. Payload:",
    data
  );
  const result = await emitWithAck("delete message", data);
  if (result.success) {
    console.log(
      "SocketUtil: 'delete message' emitted successfully and acknowledged."
    );
  } else {
    console.error("SocketUtil: Failed to emit 'delete message':", result.error);
  }
  return result.success;
};

// --- Core Socket Connection Logic ---
export const connectSocket = () => {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      console.log(
        "SocketUtil: Socket already connected. Resolving existing instance."
      );
      resolve(socket);
      return;
    }

    const userId = getUserDataFromStore();
    if (!userId) {
      console.error(
        "SocketUtil: No user ID found in Redux store. Cannot establish authenticated socket connection."
      );
      return reject(
        new Error("User ID not found for socket connection. Please log in.")
      );
    }

    console.log(
      `SocketUtil: Initiating new socket connection for user ID: ${userId}.`
    );

    // Clean up any stale socket instance before creating a new one
    if (socket) {
      console.log("SocketUtil: Cleaning up previous socket instance.");
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    // Create new socket instance
    socket = io(SOCKET_URL, {
      withCredentials: true, // Send cookies with requests
      transports: ["websocket", "polling"], // Prefer websockets, fallback to polling
      auth: {
        userId: userId, // Pass user ID for server-side authentication/room joining
      },
      reconnection: true, // Enable client-side auto-reconnection
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_INTERVAL,
      timeout: 10000, // Connection timeout
      autoConnect: false, // Prevent automatic connection immediately on creation
      forceNew: true, // Always create a new connection, important for authentication/user changes
    });

    // CRUCIAL: Expose the socket instance globally if other parts of the app use `window.socket`
    if (typeof window !== "undefined") {
      // Check if running in browser
      window.socket = socket;
    }

    // Define connection success handler
    socket.on("connect", () => {
      console.log("SocketUtil: 'connect' event received. Socket is live.");
      // The 'join' event to the user's room should happen immediately upon successful connection
      // This is moved here from the effect to ensure it's always done right after connect.
      socket.emit("join", userId);
      console.log(`SocketUtil: Emitted 'join' event for user ${userId}.`);

      resolve(socket); // Resolve the promise with the connected socket
    });

    // Define connection error handler
    socket.on("connect_error", (error) => {
      console.error(
        "SocketUtil: 'connect_error' event received during initial connection:",
        error.message,
        error
      );
      // Reject the promise immediately if the initial connection fails
      reject(error);
    });

    // Manually initiate the connection (because autoConnect is false)
    socket.connect();
  });
};

// Disconnects the socket explicitly
export const disconnectSocket = () => {
  if (socket) {
    console.log("SocketUtil: Disconnecting socket explicitly...");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket.disconnect(); // Disconnect from the server
    socket.removeAllListeners(); // Remove all event handlers
    socket = null; // Clear the module-scoped reference
    if (typeof window !== "undefined" && window.socket) {
      // Clear global reference
      delete window.socket;
    }
    console.log("SocketUtil: Socket disconnected and cleaned up.");
  }
};

// --- Event Listener Registration ---
// Generic function to register an event listener and return a cleanup function
const registerEventHandler = (eventName, handler) => {
  if (socket) {
    socket.on(eventName, handler);
    console.log(`SocketUtil: Registered handler for "${eventName}".`);
    // Return a cleanup function
    return () => {
      if (socket) {
        socket.off(eventName, handler);
        console.log(`SocketUtil: Unregistered handler for "${eventName}".`);
      }
    };
  }
  // If socket is not initialized, return a no-op function
  console.warn(
    `SocketUtil: Socket not initialized. Cannot register handler for "${eventName}".`
  );
  return () => {};
};

// Listens for 'receive message' events from the server
export const onMessage = (handler) => {
  return registerEventHandler("receive message", handler);
};

// Listens for 'typing' events
export const onTyping = (handler) => {
  return registerEventHandler("typing", handler);
};

// Listens for 'stop typing' events
export const onStopTyping = (handler) => {
  return registerEventHandler("stop typing", handler);
};

// Listens for updates on who is online
export const onOnlineUsers = (handler) => {
  return registerEventHandler("get-online-users", handler);
};

// Listens for message deletion events
export const onMessageDeleted = (handler) => {
  return registerEventHandler("message deleted", handler);
};

// Get the current socket instance
export const getSocket = () => socket;

// Check if the socket is currently connected
export const isSocketConnected = () => socket?.connected || false;
