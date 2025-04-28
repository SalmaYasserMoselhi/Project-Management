import io from "socket.io-client";
import { store } from "../features/Store/Store";

let socket = null;
let onlineUsers = [];

// Get authentication data from Redux store
const getAuthFromStore = () => {
  try {
    const state = store.getState();
    const authUser = state.login?.user;
    const isAuthenticated = state.login?.isAuthenticated;

    if (isAuthenticated && authUser?._id) {
      return { userId: authUser._id };
    }

    return null;
  } catch (error) {
    console.error("Error accessing store auth data:", error);
    return null;
  }
};

// Get JWT token from cookies
const getJwtToken = () => {
  try {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("jwt="))
        ?.split("=")[1] || ""
    );
  } catch (error) {
    console.error("Error getting JWT token:", error);
    return "";
  }
};

export const connectSocket = async () => {
  try {
    // First, disconnect any existing socket
    if (socket) {
      disconnectSocket();
    }

    // Get auth data from Redux
    const authData = getAuthFromStore();

    if (!authData) {
      console.error("User not authenticated in Redux store");
      return null;
    }

    // Use relative path to leverage Vite's proxy configuration
    socket = io("/", {
      transports: ["polling"], // Start with polling only
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Enable debug mode for troubleshooting
    localStorage.setItem("debug", "socket.io-client:*");

    socket.on("connect_error", (error) => {
      console.error("Socket connection error details:", {
        message: error.message,
        description: error.description,
        type: error.type,
      });
    });

    socket.on("connect", () => {
      socket.emit("join", authData.userId);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on("get-online-users", (users) => {
      onlineUsers = users;
    });

    // Return the socket
    return socket;
  } catch (error) {
    console.error("Socket connection failed:", error);
    return null;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => socket?.connected || false;

export const emitMessage = (message) => {
  if (!socket?.connected) {
    console.error("Cannot emit message: socket not connected");
    return;
  }
  socket.emit("send message", message);
};

export const emitTyping = (conversationId) => {
  if (!socket?.connected) {
    console.error("Cannot emit typing: socket not connected");
    return;
  }
  socket.emit("typing", conversationId);
};

export const emitStopTyping = (conversationId) => {
  if (!socket?.connected) {
    console.error("Cannot emit stop typing: socket not connected");
    return;
  }
  socket.emit("stop typing", conversationId);
};

export const joinConversation = (conversationId) => {
  if (!socket?.connected) {
    console.error("Cannot join conversation: socket not connected");
    return;
  }
  socket.emit("join conversation", conversationId);
};

export const onMessage = (callback) => {
  if (!socket) {
    console.error("Cannot listen for messages: socket not initialized");
    return () => {};
  }
  socket.on("receive message", callback);
  return () => socket.off("receive message", callback);
};

export const onTyping = (callback) => {
  if (!socket) {
    console.error("Cannot listen for typing: socket not initialized");
    return () => {};
  }
  socket.on("typing", callback);
  return () => socket.off("typing", callback);
};

export const onStopTyping = (callback) => {
  if (!socket) {
    console.error("Cannot listen for stop typing: socket not initialized");
    return () => {};
  }
  socket.on("stop typing", callback);
  return () => socket.off("stop typing", callback);
};

export const onOnlineUsers = (callback) => {
  if (!socket) {
    console.error("Cannot listen for online users: socket not initialized");
    return () => {};
  }
  // Use the correct event name from the backend
  socket.on("get-online-users", callback);
  return () => socket.off("get-online-users", callback);
};

// Re-add sendMessage for backwards compatibility with chat-context.jsx
export const sendMessage = (data) => {
  if (!socket?.connected) {
    console.warn("Socket not connected, attempting to connect...");
    return connectSocket().then(() => {
      socket.emit("send message", data);
    });
  }
  socket.emit("send message", data);
};

// Call feature functions
export const initiateCall = (data) => {
  if (!socket?.connected) {
    console.warn("Socket not connected, attempting to connect...");
    return connectSocket().then(() => {
      socket.emit("call user", data);
    });
  }
  socket.emit("call user", data);
};

export const acceptCall = (data) => {
  if (!socket?.connected) {
    console.warn("Socket not connected, attempting to connect...");
    return connectSocket().then(() => {
      socket.emit("answer call", data);
    });
  }
  socket.emit("answer call", data);
};

export const rejectCall = (data) => {
  if (!socket?.connected) {
    console.warn("Socket not connected, attempting to connect...");
    return connectSocket().then(() => {
      socket.emit("end call", data);
    });
  }
  socket.emit("end call", data);
};

export const onCallRequest = (callback) => {
  if (!socket) {
    console.error("Cannot listen for call requests: socket not initialized");
    return () => {};
  }
  socket.on("call user", callback);
  return () => socket.off("call user", callback);
};

export const onCallAccepted = (callback) => {
  if (!socket) {
    console.error("Cannot listen for call accepted: socket not initialized");
    return () => {};
  }
  socket.on("call accepted", callback);
  return () => socket.off("call accepted", callback);
};

export const onCallRejected = (callback) => {
  if (!socket) {
    console.error("Cannot listen for call rejected: socket not initialized");
    return () => {};
  }
  socket.on("end call", callback);
  return () => socket.off("end call", callback);
};
