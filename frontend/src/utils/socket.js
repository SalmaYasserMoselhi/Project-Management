import { io } from "socket.io-client";
import { store } from "../features/Store/Store";

let socket = null;
let reconnectTimer = null;
const SOCKET_URL = "http://localhost:3000";
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max delay
const INITIAL_RECONNECT_DELAY = 1000;
// Helper function to get user data from store
const getUserDataFromStore = () => {
  try {
    const state = store.getState();
    return state.login?.user?._id;
  } catch (error) {
    console.error("Error getting user data from store:", error);
    return null;
  }
};

// Keep connection alive with improved mechanism
const setupKeepAlive = (socket) => {
  const pingInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit("ping");
    } else {
      console.warn("Socket disconnected, attempting to reconnect...");
      handleReconnect();
      clearInterval(pingInterval);
    }
  }, 25000); // Send ping every 25 seconds

  // Add connection check interval
  const checkConnection = setInterval(() => {
    if (socket?.connected) {
      socket.emit("check_connection", { timestamp: Date.now() });
    } else {
      console.warn("Socket disconnected during connection check");
      handleReconnect();
    }
  }, 60000); // Check connection every minute

  return () => {
    clearInterval(pingInterval);
    clearInterval(checkConnection);
  };
};

// Handle socket reconnection with exponential backoff
const handleReconnect = async (maxAttempts = MAX_RECONNECT_ATTEMPTS) => {
  let attempts = 0;
  let delay = INITIAL_RECONNECT_DELAY;

  const attemptReconnect = async () => {
    if (socket?.connected) {
      console.log("Socket already reconnected");
      clearTimeout(reconnectTimer);
      return;
    }

    if (attempts >= maxAttempts) {
      console.error(`Failed to reconnect after ${attempts} attempts`);
      clearTimeout(reconnectTimer);
      return;
    }

    attempts++;
    console.log(`Reconnection attempt ${attempts}/${maxAttempts}`);

    try {
      await connectSocket();
      console.log("Reconnected successfully");
      clearTimeout(reconnectTimer);
    } catch (error) {
      console.error("Reconnection failed:", error);
      // Exponential backoff with jitter
      delay = Math.min(delay * 1.5 + Math.random() * 1000, MAX_RECONNECT_DELAY);
      console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`);
      reconnectTimer = setTimeout(attemptReconnect, delay);
    }
  };

  attemptReconnect();
};

// Ensure connection before emitting any event
const ensureConnection = async () => {
  if (!socket?.connected) {
    console.warn("Socket not connected, attempting to reconnect...");
    try {
      await connectSocket();
      return true;
    } catch (error) {
      console.error("Failed to reconnect socket:", error);
      return false;
    }
  }
  return true;
};

// Improved event handling with acknowledgements
export const emitWithAck = async (eventName, data, timeout = 5000) => {
  if (!(await ensureConnection())) {
    return { success: false, error: "Failed to connect" };
  }

  return new Promise((resolve) => {
    // Set timeout for acknowledgement
    const timeoutId = setTimeout(() => {
      resolve({ success: false, error: "Acknowledgement timeout" });
    }, timeout);

    // Emit with acknowledgement callback
    socket.emit(eventName, data, (response) => {
      clearTimeout(timeoutId);
      resolve({ success: true, data: response });
    });
  });
};

// Volatile messages (not stored if client is disconnected)
export const emitVolatile = async (eventName, data) => {
  if (!(await ensureConnection())) {
    return false;
  }

  // Use volatile for non-critical messages like typing indicators
  socket.volatile.emit(eventName, data);
  return true;
};

export const emitMessage = async (message) => {
  // Messages are important, so use acknowledgement with delivery status
  const result = await emitWithAck("send message", {
    ...message,
    status: "sending",
    timestamp: Date.now(),
  });

  if (result.success) {
    // Emit delivery status update
    // Use setTimeout with requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      setTimeout(() => {
        emitWithAck("update message status", {
          messageId: message._id,
          status: "delivered",
          timestamp: Date.now(),
        });
      }, 1000); // Simulate delivery time
    });
  }

  return result.success;
};

export const emitTyping = async (conversationId) => {
  // Typing indicators are volatile (non-critical)
  return emitVolatile("typing", conversationId);
};

export const emitStopTyping = async (conversationId) => {
  // Stop typing indicators are volatile (non-critical)
  return emitVolatile("stop typing", conversationId);
};

export const joinConversation = async (conversationId) => {
  // Joining a conversation is important, so use acknowledgement
  const result = await emitWithAck("join conversation", conversationId);
  return result.success;
};

// Improved event listener setup with namespaces
const setupSocketListeners = () => {
  // Clear all existing listeners
  if (socket) {
    socket.removeAllListeners();

    // Setup default error handlers
    socket.on("error", (error) => console.error("Socket error:", error));
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      handleReconnect();
    });

    // Setup reconnection handlers with better monitoring
    socket.on("reconnect", (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      // Re-setup event listeners after reconnection
      setupSocketListeners();
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
    });

    socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
      // Try to reconnect immediately after error
      handleReconnect();
    });

    socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      // Schedule a delayed reconnection attempt
      setTimeout(() => handleReconnect(), 5000);
    });

    // Add connection state monitoring
    socket.on("connect", () => {
      console.log("Socket connected successfully");
      setupKeepAlive(socket);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      // Try to reconnect after any disconnection
      handleReconnect();
    });

    // Setup ping/pong handlers
    socket.on("pong", () => {
      console.debug("Received pong from server");
    });
  }
};

// Improved event listener registration that uses namespaces
export const registerEventHandler = (eventName, callback) => {
  if (!socket) {
    console.warn(
      `Cannot register handler for ${eventName}: socket not initialized`
    );
    return () => {};
  }

  // Remove existing listeners for this event
  socket.off(eventName);

  // Add new listener
  socket.on(eventName, callback);

  // Return cleanup function
  return () => {
    if (socket) {
      socket.off(eventName);
    }
  };
};

// Use the improved event registration for standard events
export const onMessage = (callback) => {
  // Handle regular messages
  const messageHandler = (message) => {
    // Batch message updates for better performance
    if (!message.batchId) {
      message.batchId = Date.now();
    }

    callback(message);
  };

  // Handle delivery status updates
  const statusHandler = (statusUpdate) => {
    callback({
      ...statusUpdate,
      type: "status",
    });
  };

  // Register both handlers
  const cleanupMessage = registerEventHandler(
    "receive message",
    messageHandler
  );
  const cleanupStatus = registerEventHandler("message status", statusHandler);

  return () => {
    cleanupMessage();
    cleanupStatus();
  };
};

export const onTyping = (callback) => {
  return registerEventHandler("typing", callback);
};

export const onStopTyping = (callback) => {
  return registerEventHandler("stop typing", callback);
};

export const onOnlineUsers = (callback) => {
  return registerEventHandler("get-online-users", callback);
};

// Re-add sendMessage for backwards compatibility with chat-context.jsx
export const sendMessage = async (data) => {
  return emitMessage(data);
};

// Call feature functions with acknowledgements
export const initiateCall = async (data) => {
  const result = await emitWithAck("call user", data);
  return result.success;
};

export const acceptCall = async (data) => {
  const result = await emitWithAck("accept call", data);
  return result.success;
};

export const rejectCall = async (data) => {
  const result = await emitWithAck("reject call", data);
  return result.success;
};

export const endCall = async (data) => {
  const result = await emitWithAck("end call", data);
  return result.success;
};

// Initialize socket with improved setup
export const connectSocket = async () => {
  return new Promise((resolve, reject) => {
    try {
      if (socket?.connected) {
        console.log("Socket already connected");
        resolve(socket);
        return;
      }

      const userId = getUserDataFromStore();
      if (!userId) {
        reject(new Error("No user ID found"));
        return;
      }

      console.log("Initializing socket connection for user:", userId);

      // Clean up any existing socket
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }

      socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"], // Try websocket first
        auth: {
          userId: userId,
        },
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: RECONNECT_INTERVAL,
        timeout: 10000, // Increase timeout to 10 seconds
        autoConnect: false,
        forceNew: true,
      });

      // Setup ping interval to keep connection alive
      let pingInterval = null;

      socket.on("connect", () => {
        console.log("Socket connected successfully");
        socket.emit("join", userId);

        // Setup keep-alive ping
        pingInterval = setupKeepAlive(socket);

        // Setup all listeners
        setupSocketListeners();

        resolve(socket);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);

        // Clear ping interval
        if (pingInterval) {
          clearInterval(pingInterval);
        }

        // Automatically try to reconnect for certain disconnect reasons
        if (
          reason === "io server disconnect" ||
          reason === "transport close" ||
          reason === "ping timeout"
        ) {
          handleReconnect();
        }
      });

      socket.connect();
    } catch (error) {
      console.error("Socket connection failed:", error);
      reject(error);
    }
  });
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("Disconnecting socket...");

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => socket?.connected || false;
