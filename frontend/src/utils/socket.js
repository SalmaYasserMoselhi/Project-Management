import { io } from "socket.io-client";
import { store } from "../features/Store/Store";

let socket = null;
const SOCKET_URL = "http://localhost:3000"; // التأكد من استخدام البورت الصحيح

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

export const connectSocket = async () => {
  return new Promise((resolve, reject) => {
    try {
      // التحقق من وجود اتصال نشط
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

      socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["polling", "websocket"],
        auth: {
          userId: userId,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: false,
        forceNew: true,
      });

      socket.on("connect", () => {
        console.log("Socket connected successfully");
        socket.emit("join", userId);
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        reject(error);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
        reject(error);
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
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => socket?.connected || false;

export const emitMessage = (message) => {
  if (!socket?.connected) {
    console.warn("Socket not connected, attempting to reconnect...");
    return connectSocket().then(() => {
      socket.emit("send message", message);
    });
  }
  socket.emit("send message", message);
};

export const emitTyping = (conversationId) => {
  if (!socket?.connected) {
    console.warn("Socket not connected when trying to emit typing");
    return connectSocket().then(() => {
      socket.emit("typing", conversationId);
    });
  }
  socket.emit("typing", conversationId);
};

export const emitStopTyping = (conversationId) => {
  if (!socket?.connected) {
    console.warn("Socket not connected when trying to emit stop typing");
    return connectSocket().then(() => {
      socket.emit("stop typing", conversationId);
    });
  }
  socket.emit("stop typing", conversationId);
};

export const joinConversation = (conversationId) => {
  if (!socket?.connected) {
    console.warn("Socket not connected when trying to join conversation");
    return connectSocket().then(() => {
      socket.emit("join conversation", conversationId);
    });
  }
  socket.emit("join conversation", conversationId);
};

const setupEventListener = (eventName, callback) => {
  if (!socket) {
    console.warn(`Cannot setup ${eventName} listener: socket not initialized`);
    return () => {};
  }

  // Remove any existing listeners for this event
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

export const onMessage = (callback) => {
  return setupEventListener("receive message", callback);
};

export const onTyping = (callback) => {
  return setupEventListener("typing", callback);
};

export const onStopTyping = (callback) => {
  return setupEventListener("stop typing", callback);
};

export const onOnlineUsers = (callback) => {
  return setupEventListener("get-online-users", callback);
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
