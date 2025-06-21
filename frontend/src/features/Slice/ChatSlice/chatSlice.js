import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { checkAuthStatus as checkAuth } from "../authSlice/loginSlice";
// Assuming 'store' is located at ../../Store/Store or similar, adjust if different
// import { store } from "../../Store/Store"; // !!! IMPORTANT: ADJUST THIS PATH if your Redux store file is elsewhere !!!
// Removed direct import of store

// Import specific socket utility functions for use in thunks
// These functions are correctly exported from src/utils/socket.js in the previous full update.
import {
  emitMessage,
  emitDeleteMessage,
  emitTyping,
  emitStopTyping,
} from "../../../utils/socket";

// Re-export checkAuthStatus from loginSlice if it's part of chat logic flow
export const checkAuthStatus = checkAuth;

const API_BASE_URL = "http://localhost:3000/api/v1"; // Ensure this matches your backend API URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  credentials: "include", // This is crucial for sending/receiving cookies (like JWT)
});

// Axios Interceptor for handling 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login page if unauthorized, but only if not already there
      // Ensure this runs only in a browser environment
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Axios Interceptor to add JWT token from cookies to requests
api.interceptors.request.use(
  (config) => {
    // Check if running in a browser environment where 'document' is available
    if (typeof document !== "undefined") {
      const jwt = document.cookie
        .split("; ")
        .find((row) => row.startsWith("jwt="))
        ?.split("=")[1];

      if (jwt) {
        config.headers.Authorization = `Bearer ${jwt}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Initial state for the chat slice
const initialState = {
  conversations: [],
  users: [], // List of all users, e.g., for group creation
  searchResults: [], // Results from user search
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' | 'sending_message'
  error: null,
  retryAfter: null, // For rate limiting or server-suggested retries
  activeConversation: null, // The currently viewed conversation
  currentCall: null, // State for active calls
  messages: [], // Messages for the active conversation
  onlineUsers: [], // List of currently online user IDs
  userCache: {}, // Cache for user profile data fetched by ID
  loading: false, // General loading state for UI (e.g., initial fetch)
  groupCreationLoading: false, // Specific loading state for group creation
  showEmojiPicker: false, // UI state for emoji picker visibility
  isTyping: false, // Global typing indicator for the active chat (can be refined to per-user)
};

// Async Thunk: Fetch all conversations for the authenticated user
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue, getState }) => {
    try {
      const response = await api.get("/conversations");

      let conversationsData = [];
      // Handle various backend response formats
      if (response.data) {
        if (response.data.status === "success" && response.data.data) {
          conversationsData = response.data.data.conversations || [];
        } else if (response.data.data) {
          conversationsData = response.data.data;
        } else if (Array.isArray(response.data)) {
          conversationsData = response.data;
        }
      }

      if (!Array.isArray(conversationsData)) {
        console.error(
          "fetchConversations: Invalid data format received:",
          conversationsData
        );
        return rejectWithValue(
          "Invalid response format from server when fetching conversations."
        );
      }

      const currentUserId = getState().login?.user?._id;

      // Process raw conversation data into a consistent format for the frontend
      const processedConversations = conversationsData.map((conversation) => {
        const isGroup =
          conversation.isGroup === true ||
          conversation.isGroupChat === true || // Handle possible alternate backend flags
          conversation.type === "group"; // Handle type field for group detection

        // For group chats, ensure admin object is populated if only ID is provided
        if (
          isGroup &&
          conversation.admin &&
          typeof conversation.admin === "string"
        ) {
          const adminUser = (conversation.users || []).find(
            (user) => user._id === conversation.admin
          );
          if (adminUser) {
            conversation.admin = adminUser;
          }
        }

        const participants =
          conversation.users || conversation.participants || [];

        // Determine the 'otherUser' object for private chats for display purposes
        const otherUser = !isGroup
          ? participants.find((u) => (u._id === currentUserId ? null : u)) // Find the user that is not the current user
          : null;

        // Determine the display name for the conversation list item
        const name =
          conversation.name || // Use provided conversation name (for groups)
          (isGroup
            ? "Group Chat" // Default for unnamed groups
            : otherUser?.fullName || // For private chats, use other user's full name
              `${otherUser?.firstName || ""} ${
                otherUser?.lastName || ""
              }`.trim() ||
              otherUser?.username ||
              otherUser?.email ||
              "Chat"); // Fallback

        // Determine the display picture for the conversation list item
        const picture =
          conversation.picture || // Use provided conversation picture (for groups)
          (isGroup
            ? "https://image.pngaaa.com/78/6179078-middle.png" // Default group chat icon
            : otherUser?.avatar || null); // For private chats, use other user's avatar

        return {
          ...conversation,
          isGroup, // Ensure this property is always set correctly
          name,
          picture,
          otherUser: otherUser || null, // Store the other user object for direct access in context
        };
      });

      console.log(
        "fetchConversations: Fulfilled. Processed conversations:",
        processedConversations.length
      );
      return processedConversations;
    } catch (error) {
      console.error("fetchConversations: ERROR fetching conversations:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch conversations"
      );
    }
  }
);

// Async Thunk: Fetch messages for a specific conversation
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      console.log(
        "fetchMessages: Attempting to fetch messages for convoId:",
        conversationId
      );
      const response = await api.get(`/message/${conversationId}`);
      console.log(
        "fetchMessages: Fetched messages response data:",
        response.data
      );
      return response.data.data.messages; // Assuming messages are nested under response.data.data.messages
    } catch (error) {
      console.error("fetchMessages: Error fetching messages:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch messages"
      );
    }
  }
);

// Async Thunk: Send a chat message via Socket.IO
// This thunk now ONLY handles the client-side initiation of sending a message
// by emitting a Socket.IO event. The actual saving to DB and broadcasting happens on the backend.
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (
    { conversationId, content, isEmoji },
    { rejectWithValue, getState }
  ) => {
    try {
      const currentUser = getState().login.user; // Get current user from Redux store for sender info
      if (!currentUser?._id) {
        throw new Error(
          "User not logged in or ID missing for sending message. Cannot emit."
        );
      }

      // Construct the payload for the socket event
      const messagePayloadForSocket = {
        conversationId: conversationId,
        content: content,
        isEmoji: isEmoji || false,
        sender: { _id: currentUser._id }, // Only send sender ID to backend for consistency
      };

      console.log(
        "chatSlice: sendMessage Thunk: Dispatching emitMessage (socket utility) with payload:",
        messagePayloadForSocket
      );
      // Call the socket utility function to emit the message.
      // `emitMessage` in `utils/socket.js` handles the actual `socket.emit` and acknowledgement.
      const success = await emitMessage(messagePayloadForSocket);

      if (!success) {
        throw new Error(
          "Failed to send message via WebSocket (no server acknowledgment)."
        );
      }

      console.log(
        "chatSlice: sendMessage Thunk finished. Message emission initiated via socket."
      );
      // Return a minimal payload; the actual message object (with server-generated ID, timestamp)
      // will be added to the state via the `addMessage` reducer when the 'receive message' socket event fires.
      return {
        status: "initiated",
        tempMessage: {
          /* original temp data if needed */
        },
      };
    } catch (error) {
      console.error("chatSlice: Error in sendMessage thunk:", error);
      return rejectWithValue(
        error.message || "Failed to initiate message send"
      );
    }
  }
);

// Async Thunk: Send a file message via direct HTTP POST request (needs refactoring for full real-time via sockets)
export const sendFileMessage = createAsyncThunk(
  "chat/sendFileMessage",
  async ({ conversationId, files }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      // Append all files to FormData
      if (Array.isArray(files) || files instanceof FileList) {
        Array.from(files).forEach((file) => {
          formData.append("files", file);
        });
      } else {
        formData.append("files", files); // Handle single file case
      }
      formData.append("convoId", conversationId); // Ensure backend expects 'convoId' for files

      console.log("sendFileMessage: Sending file via API POST request.");
      const response = await api.post(`/message`, formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Required for FormData
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`File Upload Progress: ${percentCompleted}%`);
        },
      });

      if (!response.data?.data?.populatedMessage) {
        throw new Error(
          "Server response missing populated message data after file upload."
        );
      }
      console.log(
        "sendFileMessage: File message sent via API. Populated message:",
        response.data.data.populatedMessage
      );
      return response.data.data.populatedMessage; // Return the saved message object
    } catch (error) {
      console.error("sendFileMessage: Error sending file:", error);
      let errorMessage = "Failed to send file";
      if (error.response) {
        if (error.response.status === 413) {
          errorMessage = "File size too large.";
        } else if (error.response.status === 415) {
          errorMessage = "Unsupported file type.";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// Async Thunk: Create a new private (one-on-one) conversation
export const createConversation = createAsyncThunk(
  "chat/createConversation",
  async (userId, { rejectWithValue, getState, dispatch }) => {
    try {
      if (!userId) {
        throw new Error("Target user ID is required to create a conversation.");
      }
      const currentUser = getState().login?.user;
      if (currentUser?._id === userId) {
        return rejectWithValue(
          "You cannot create a conversation with yourself."
        );
      }

      // Try to get user data from Redux cache first, then API if not found
      let userData = getState().chat.userCache[userId];
      if (!userData) {
        console.log(
          `createConversation: User ${userId} not in cache, fetching from API.`
        );
        const userResponse = await api.get(`/users/${userId}`);
        userData =
          userResponse.data?.data?.user ||
          userResponse.data?.data ||
          userResponse.data;
        if (userData && userData._id) {
          dispatch(cacheUserData(userData)); // Cache the newly fetched user data
        }
      }

      if (!userData) {
        throw new Error(
          "Could not retrieve user data for conversation creation."
        );
      }

      // Determine display name and picture for the new active conversation based on target user
      const userName =
        userData.fullName ||
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        userData.username ||
        userData.email ||
        "Unknown User";
      const userPicture = userData.avatar || null;

      // Payload for the API call to create conversation
      const payload = {
        receiverId: userId,
        name: userName, // Use user's name as conversation name for direct chat
        picture: userPicture,
        type: "private",
        isGroup: false,
      };

      console.log(
        "createConversation: Sending API request to create private conversation."
      );
      const response = await api.post("/conversations", payload);

      // Extract conversation data from various possible response structures
      let conversationData =
        response.data?.data?.newConvo || response.data?.data || response.data;

      if (!conversationData || !conversationData._id) {
        throw new Error(
          "Invalid conversation data received from server after creation."
        );
      }

      // Enhance conversation data for frontend display with `otherUser` object
      const enhancedConversation = {
        ...conversationData,
        name: userName,
        picture: userPicture,
        otherUser: userData, // Store the other user's full object in `otherUser` for context
        isGroup: false, // Ensure type is correctly set
      };

      console.log(
        "createConversation: Private conversation created/found. Enhanced data:",
        enhancedConversation
      );
      // Dispatch fetchConversations to refresh the list after a short delay for backend processing
      setTimeout(() => {
        dispatch(fetchConversations());
      }, 500);

      return enhancedConversation;
    } catch (error) {
      console.error("createConversation: Error creating conversation:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create conversation"
      );
    }
  }
);

// Async Thunk: Create a new group conversation
export const createGroupConversation = createAsyncThunk(
  "chat/createGroupConversation",
  async (groupData, { getState, rejectWithValue, dispatch }) => {
    try {
      console.log("createGroupConversation: Called with:", groupData);

      const { groupName, participantIds, groupPicture } = groupData;

      if (!groupName || groupName.trim() === "") {
        return rejectWithValue("Group name is required.");
      }
      if (
        !participantIds ||
        !Array.isArray(participantIds) ||
        participantIds.length < 2
      ) {
        return rejectWithValue("Please select at least 2 users for the group.");
      }

      const currentUser = getState().login?.user;
      if (!currentUser || !currentUser._id) {
        return rejectWithValue("User must be logged in to create a group.");
      }

      let allParticipants = [...participantIds];
      // Ensure the current user is included in the participants list for the backend
      if (!allParticipants.includes(currentUser._id)) {
        allParticipants.push(currentUser._id);
      }

      // Construct the request data for the backend API
      const requestData = {
        name: groupName,
        users: allParticipants, // Array of user IDs
        admin: currentUser._id, // Set current user as admin
        picture: groupPicture || undefined, // Base64 encoded image or undefined
      };

      console.log(
        "createGroupConversation: Sending API request to create group:",
        requestData
      );
      const response = await api.post("/conversations/group", requestData);

      // Extract conversation data from various possible response structures
      let conversation =
        response.data?.data?.populatedConvo ||
        response.data?.data?.conversation ||
        response.data?.data ||
        response.data;

      if (!conversation || !conversation._id) {
        throw new Error(
          "Invalid conversation data returned by server after group creation."
        );
      }

      // Enhance the returned conversation object for frontend use
      const enhancedConversation = {
        ...conversation,
        _id: conversation._id, // Ensure consistent ID
        name: conversation.name || groupName,
        picture:
          conversation.picture ||
          "https://image.pngaaa.com/78/6179078-middle.png",
        isGroup: true, // Explicitly set as group
        isGroupChat: true, // Also set this for redundancy/compatibility
        admin: conversation.admin || currentUser._id, // Ensure admin is populated
        users: conversation.users || [], // Participants list from backend
        participants: conversation.users || conversation.participants || [], // Ensure consistency
      };

      console.log(
        "createGroupConversation: Enhanced group conversation data:",
        enhancedConversation
      );
      // Immediately trigger a fetch of all conversations to update the sidebar, with slight delay
      setTimeout(() => {
        dispatch(fetchConversations());
      }, 500);

      return enhancedConversation;
    } catch (error) {
      console.error("createGroupConversation: Error in thunk:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create group conversation"
      );
    }
  }
);

// Async Thunk: Add a user to an existing group conversation
export const addUserToGroup = createAsyncThunk(
  "chat/addUserToGroup",
  async ({ conversationId, userId }, { rejectWithValue }) => {
    try {
      console.log(
        `addUserToGroup: Adding user ${userId} to conversation ${conversationId}`
      );
      const response = await api.patch("/conversations/group/add-user", {
        conversationId,
        userId,
      });

      let updatedConversation = response.data?.data || response.data;

      if (!updatedConversation || !updatedConversation._id) {
        throw new Error("Invalid response format after adding user to group.");
      }
      console.log(
        "addUserToGroup: User added. Updated conversation:",
        updatedConversation
      );
      return updatedConversation;
    } catch (error) {
      console.error("addUserToGroup: Error adding user:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to add user to group"
      );
    }
  }
);

// Async Thunk: Remove a user from an existing group conversation
export const removeUserFromGroup = createAsyncThunk(
  "chat/removeUserFromGroup",
  async ({ conversationId, userId }, { rejectWithValue }) => {
    try {
      console.log(
        `removeUserFromGroup: Removing user ${userId} from conversation ${conversationId}`
      );
      const response = await api.patch("/conversations/group/remove-user", {
        conversationId,
        userId,
      });

      let updatedConversation = response.data?.data || response.data;

      if (!updatedConversation || !updatedConversation._id) {
        throw new Error(
          "Invalid response format after removing user from group."
        );
      }
      console.log(
        "removeUserFromGroup: User removed. Updated conversation:",
        updatedConversation
      );
      return updatedConversation;
    } catch (error) {
      console.error("removeUserFromGroup: Error removing user:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove user from group"
      );
    }
  }
);

// Async Thunk: Allows current user to leave a group conversation
export const leaveGroup = createAsyncThunk(
  "chat/leaveGroup",
  async (conversationId, { rejectWithValue, getState }) => {
    try {
      const currentUser = getState().login.user;
      if (!currentUser?._id) {
        throw new Error("User ID not available to leave group.");
      }
      const userId = currentUser._id;
      console.log(
        `leaveGroup: User ${userId} leaving conversation ${conversationId}`
      );

      const response = await api.patch("/conversations/group/leave", {
        conversationId,
        userId,
      });

      let conversationData = response.data?.data || response.data;

      if (!conversationData) {
        throw new Error("Invalid response format after leaving group.");
      }
      console.log(
        "leaveGroup: User left group. Conversation data:",
        conversationData
      );
      return conversationData;
    } catch (error) {
      console.error("leaveGroup: Error leaving group:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to leave group"
      );
    }
  }
);

// Async Thunk: Search for users by a search term
export const searchUsers = createAsyncThunk(
  "chat/searchUsers",
  async (searchTerm, { rejectWithValue, getState }) => {
    try {
      const { login } = getState();
      if (!login || !login.isAuthenticated || !login.user?._id) {
        throw new Error("User must be logged in to search.");
      }

      if (!searchTerm || searchTerm.trim().length === 0) {
        return []; // Return empty array for empty search term, no API call
      }

      const currentUserId = login.user._id;
      const encodedSearchTerm = encodeURIComponent(searchTerm.trim());

      console.log(`searchUsers: Searching for '${searchTerm}'`);
      const response = await api.get(
        `/users/workspace-users?search=${encodedSearchTerm}&limit=20` // Limit results
      );

      let users =
        response.data?.data?.users || response.data?.users || response.data;
      if (!Array.isArray(users)) {
        throw new Error("Invalid user search response format.");
      }

      // Filter out the current user from search results
      const filteredUsers = users.filter((user) => user._id !== currentUserId);
      console.log(`searchUsers: Found ${filteredUsers.length} users.`);
      return filteredUsers;
    } catch (error) {
      console.error("searchUsers: Error searching users:", error);
      return rejectWithValue(error.message || "Failed to search users");
    }
  }
);

// Async Thunk: Fetch all available users (e.g., for group creation member selection)
export const getAllUsers = createAsyncThunk(
  "chat/getAllUsers",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { login } = getState();
      if (!login || !login.isAuthenticated || !login.user?._id) {
        throw new Error("User must be logged in to get users.");
      }

      console.log("getAllUsers: Fetching all workspace users.");
      const response = await api.get(`/users/workspace-users`);

      let users =
        response.data?.data?.users || response.data?.users || response.data;
      if (!Array.isArray(users)) {
        throw new Error("Invalid all users response format.");
      }

      const currentUserId = login.user._id;
      // Filter out the current user from the list
      const filteredUsers = users.filter((user) => user._id !== currentUserId);
      console.log(`getAllUsers: Found ${filteredUsers.length} users.`);
      return filteredUsers;
    } catch (error) {
      console.error("getAllUsers: Error fetching all users:", error);
      if (error.response?.status === 429) {
        // Handle rate limiting
        return rejectWithValue(
          "Too many requests. Please wait a moment and try again."
        );
      }
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

// Async Thunk: Fetch a single user's data by ID (used for caching)
export const fetchUserById = createAsyncThunk(
  "chat/fetchUserById",
  async (userId, { rejectWithValue, getState, dispatch }) => {
    try {
      if (!userId) {
        throw new Error("User ID is required for fetchUserById.");
      }

      // Check cache first to avoid unnecessary API calls
      const { chat } = getState();
      if (chat.userCache && chat.userCache[userId]) {
        return chat.userCache[userId];
      }

      console.log(`fetchUserById: Fetching user ${userId} from API.`);
      const response = await api.get(`/users/${userId}`);

      let userData =
        response.data?.data?.user || response.data?.user || response.data;

      if (!userData || !userData._id) {
        throw new Error("Invalid user data received for fetchUserById.");
      }

      dispatch(cacheUserData(userData)); // Cache the fetched user data
      console.log(`fetchUserById: Fetched and cached user ${userId}.`);
      return userData;
    } catch (error) {
      console.error(`fetchUserById: Error fetching user ${userId}:`, error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user data"
      );
    }
  }
);

// Async Thunk: Update conversation details (e.g., group name, picture)
export const updateConversationDetails = createAsyncThunk(
  "chat/updateConversationDetails",
  async ({ conversationId, name, picture }, { rejectWithValue }) => {
    try {
      if (!conversationId) {
        throw new Error(
          "Conversation ID is required for updateConversationDetails."
        );
      }

      console.log(
        `updateConversationDetails: Updating convo ${conversationId}.`
      );
      const response = await api.patch(`/conversations/${conversationId}`, {
        name,
        picture,
      });

      let conversationData =
        response.data?.data || response.data?.conversation || response.data;

      if (!conversationData || !conversationData._id) {
        throw new Error(
          "Invalid response format after updating conversation details."
        );
      }
      console.log(
        "updateConversationDetails: Conversation details updated:",
        conversationData
      );
      return conversationData;
    } catch (error) {
      console.error(
        "updateConversationDetails: Error updating conversation details:",
        error
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to update conversation details"
      );
    }
  }
);

// Async Thunk: Refresh a single conversation's data (e.g., after an update event)
export const refreshConversation = createAsyncThunk(
  "chat/refreshConversation",
  async (conversationId, { getState, dispatch, rejectWithValue }) => {
    try {
      const { chat } = getState();
      // Check if conversation already exists in current state before refetching to avoid unnecessary calls
      const existingConversation = chat.conversations.find(
        (conv) => conv._id === conversationId
      );

      if (!existingConversation) {
        console.log(
          `refreshConversation: Convo ${conversationId} not found in current list, refetching all conversations.`
        );
        await dispatch(fetchConversations()).unwrap(); // Fetch all conversations if this one isn't in state
        return; // Exit as fetchConversations will handle the state update
      }

      // Fetch specific conversation details from the API to get the freshest data
      console.log(
        `refreshConversation: Fetching updated details for convo ${conversationId}.`
      );
      const response = await api.get(`/conversations/${conversationId}`);

      let conversationData = response.data?.data || response.data;

      if (!conversationData || !conversationData._id) {
        throw new Error("Invalid conversation data received for refresh.");
      }
      console.log(
        "refreshConversation: Fetched updated conversation details:",
        conversationData
      );
      return conversationData;
    } catch (error) {
      console.error(
        `refreshConversation: Error refreshing conversation ${conversationId}:`,
        error
      );
      return rejectWithValue("Failed to refresh conversation");
    }
  }
);

// Async Thunk: Delete a message via API, then emit socket event for real-time sync
export const deleteMessage = createAsyncThunk(
  "chat/deleteMessage",
  async (messageId, { rejectWithValue, getState }) => {
    try {
      console.log(
        `deleteMessage: Sending API request to delete message ${messageId}.`
      );
      const response = await api.delete(`/message/${messageId}`); // API call to delete from DB

      const { chat, login } = getState();
      const messageToDelete = chat.messages.find(
        (msg) => msg._id === messageId
      );

      // Emit socket event for real-time deletion sync across all connected clients
      // Ensure window and window.socket exist before emitting client-side
      if (typeof window !== "undefined" && window.socket && messageToDelete) {
        console.log(
          `deleteMessage: Emitting 'delete message' socket event for ${messageId}.`
        );
        await emitDeleteMessage({
          // Use the emitDeleteMessage utility for acknowledgment
          messageId: messageId,
          conversationId:
            messageToDelete.conversation?._id || messageToDelete.conversation, // Ensure conversation ID is correct
          deletedBy: login?.user?._id, // Pass who deleted it (optional)
        });
      }

      console.log(`deleteMessage: Message ${messageId} deleted via API.`);
      return { messageId, response: response.data }; // Return minimal data, reducer handles removal
    } catch (error) {
      console.error(
        `deleteMessage: Error deleting message ${messageId}:`,
        error
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete message"
      );
    }
  }
);

// --- Chat Slice Definition ---
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    // Clears all messages from the current view
    clearMessages: (state) => {
      state.messages = [];
      console.log("chatSlice: Messages array cleared.");
    },
    // Sets the global typing indicator status
    setIsTyping: (state, action) => {
      state.isTyping = action.payload; // Expects boolean
      console.log("chatSlice: Typing indicator set to:", action.payload);
    },
    // Sets the currently active conversation
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      console.log(
        "chatSlice: Active conversation set to:",
        action.payload?.name || action.payload?.id || "None"
      );
      // If setting a group conversation, ensure its admin object is fully populated for UI access
      if (action.payload && action.payload.isGroup && action.payload.id) {
        const fullConversation = state.conversations.find(
          (conv) => conv._id === action.payload.id
        );
        if (fullConversation && fullConversation.admin) {
          state.activeConversation.admin = fullConversation.admin;
        }
      }
    },
    // Sets the current call state (for voice/video calls)
    setCurrentCall: (state, action) => {
      state.currentCall = action.payload;
      console.log("chatSlice: Current call state set:", action.payload);
    },
    // Adds a new message to the messages array and updates the corresponding conversation's last message
    addMessage: (state, action) => {
      const newMessage = action.payload;
      console.log(
        "chatSlice: addMessage reducer processing new message:",
        newMessage
      );

      // Determine the conversation ID from the new message object
      // This now correctly handles both server messages (with a 'conversation' object)
      // and temporary client-side messages (with a 'conversationId' string).
      const conversationId =
        newMessage.conversation?._id || newMessage.conversationId;

      if (!conversationId) {
        console.warn(
          "chatSlice: New message has no valid conversation identifier. Skipping.",
          newMessage
        );
        return;
      }

      // Check if this message is for the currently active conversation
      const isForActiveConversation =
        conversationId === state.activeConversation?.id;

      // Check if this is a server-returned message (has an _id that doesn't start with 'temp-')
      const isServerMessage =
        newMessage._id && !newMessage._id.startsWith("temp-");

      if (isForActiveConversation) {
        // Check if this is a server message that replaces a temporary message
        if (isServerMessage) {
          // Look for a temporary message in the same conversation
          // First check for temporary text messages
          let tempMessageIndex = state.messages.findIndex(
            (msg) =>
              msg.conversationId === conversationId &&
              msg._id.startsWith("temp-") &&
              !msg._id.startsWith("temp-file-") &&
              // Match by timestamp (within 2 seconds) if content is the same
              Math.abs(
                new Date(msg.createdAt) - new Date(newMessage.createdAt)
              ) < 2000 &&
              (msg.content === newMessage.message ||
                msg.content === newMessage.content)
          );

          // If no temporary text message found, check for temporary file messages
          if (
            tempMessageIndex === -1 &&
            newMessage.files &&
            newMessage.files.length > 0
          ) {
            tempMessageIndex = state.messages.findIndex(
              (msg) =>
                msg.conversationId === conversationId &&
                msg._id.startsWith("temp-file-") &&
                msg.type === "file_placeholder" &&
                // Match by timestamp (within 5 seconds)
                Math.abs(
                  new Date(msg.createdAt) - new Date(newMessage.createdAt)
                ) < 5000
            );
          }

          if (tempMessageIndex !== -1) {
            // Replace the temporary message with the server message
            console.log(
              `chatSlice: Replacing temporary message at index ${tempMessageIndex} with server message ${newMessage._id}`
            );
            state.messages[tempMessageIndex] = newMessage;
          } else {
            // No matching temporary message found, just add the new message
            const alreadyExists = state.messages.some(
              (msg) => msg._id === newMessage._id
            );

            if (!alreadyExists) {
              state.messages.push(newMessage);
              console.log(
                "chatSlice: Added new server message to active conversation's messages array."
              );
            } else {
              console.log(
                `chatSlice: Message ${newMessage._id} already exists in messages array. Skipping addition.`
              );
            }
          }
        } else {
          // This is a temporary message, add it if it doesn't exist already
          const alreadyExists = state.messages.some(
            (msg) => msg._id === newMessage._id
          );

          if (!alreadyExists) {
            state.messages.push(newMessage);
            console.log(
              "chatSlice: Added new temporary message to active conversation's messages array."
            );
          }
        }
      } else {
        console.log(
          `chatSlice: Received message for non-active conversation (${conversationId}).`
        );
      }

      // Always update the `lastMessage` field in the main `conversations` list
      // and optionally move the conversation to the top
      const convoIndex = state.conversations.findIndex(
        (c) => c._id === conversationId
      );
      if (convoIndex !== -1) {
        state.conversations[convoIndex].lastMessage = newMessage;
        // Move the conversation to the top of the list to show it's recently active
        const [movedConvo] = state.conversations.splice(convoIndex, 1);
        state.conversations.unshift(movedConvo);
        console.log(
          `chatSlice: Updated last message for conversation ${conversationId} and reordered list.`
        );
      } else {
        console.warn(
          `chatSlice: Conversation ${conversationId} not found in list for updating last message.`
        );
      }
    },
    // Explicitly replaces a temporary file message with the server-returned message
    replaceFileMessage: (state, action) => {
      const { tempMessageId, serverMessage } = action.payload;

      console.log(
        `chatSlice: replaceFileMessage called to replace ${tempMessageId} with server message ${serverMessage._id}`
      );

      // Find the index of the temporary file message
      const tempMessageIndex = state.messages.findIndex(
        (msg) => msg._id === tempMessageId
      );

      if (tempMessageIndex !== -1) {
        // Replace the temporary message with the server message
        state.messages[tempMessageIndex] = serverMessage;
        console.log(
          `chatSlice: Successfully replaced temporary file message at index ${tempMessageIndex}`
        );
      } else {
        // If temporary message not found, just add the server message
        const alreadyExists = state.messages.some(
          (msg) => msg._id === serverMessage._id
        );

        if (!alreadyExists) {
          state.messages.push(serverMessage);
          console.log(
            "chatSlice: Added server file message (temp message not found)"
          );
        } else {
          console.log(
            `chatSlice: Server message ${serverMessage._id} already exists. Skipping addition.`
          );
        }
      }
    },
    // Updates the list of currently online users
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
      console.log(
        "chatSlice: Online users list updated. Total:",
        action.payload.length
      );
    },
    // Updates the status of a specific message (e.g., 'sent', 'delivered', 'read')
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;
      const message = state.messages.find((msg) => msg._id === messageId);
      if (message) {
        message.status = status;
        console.log(
          `chatSlice: Message ${messageId} status updated to ${status}.`
        );
      }
    },
    // Caches user profile data for quick lookup
    cacheUserData: (state, action) => {
      const user = action.payload;
      if (user && user._id) {
        state.userCache[user._id] = { ...user };
        console.log("chatSlice: User data cached for ID:", user._id);
      }
    },
    // Directly sets the entire conversations array (used after full refetches)
    setConversations: (state, action) => {
      state.conversations = action.payload;
      console.log(
        "chatSlice: Conversations list explicitly set. Total:",
        action.payload.length
      );
    },
    // Updates the `lastMessage` property of a specific conversation in the list
    updateConversationLastMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      const convoIndex = state.conversations.findIndex(
        (c) => c._id === conversationId
      );
      if (convoIndex !== -1) {
        state.conversations[convoIndex].lastMessage = message;
        console.log(
          `chatSlice: updateConversationLastMessage for ${conversationId}.`
        );
      }
    },
    // Updates an entire conversation object in the list, or adds it if new
    updateConversationInList: (state, action) => {
      const updated = action.payload;
      if (!updated || !updated._id) {
        console.warn(
          "chatSlice: Skipping updateConversationInList: Invalid payload (missing _id).",
          updated
        );
        return;
      }

      const index = state.conversations.findIndex((c) => c._id === updated._id);
      if (index !== -1) {
        // Update existing conversation by merging properties
        Object.assign(state.conversations[index], updated); // Update in place
      } else {
        // Add new conversation to the beginning if it doesn't exist
        state.conversations.unshift(updated);
        console.log(
          "chatSlice: Added new conversation to list (not found previously):",
          updated._id
        );
      }
    },
    // Handles a message deleted event, removes it from display and updates last message
    handleMessageDeleted: (state, action) => {
      const { messageId } = action.payload;
      console.log("chatSlice: handleMessageDeleted reducer for ID:", messageId);

      // Remove the deleted message from the active messages array
      state.messages = state.messages.filter((msg) => msg._id !== messageId);
      console.log(
        `chatSlice: Message ${messageId} removed from messages array.`
      );

      // Update last message in conversations if the deleted message was the last one
      state.conversations = state.conversations.map((convo) => {
        if (convo.lastMessage && convo.lastMessage._id === messageId) {
          // Find the new most recent message for this conversation that is still present
          const newLastMessage = state.messages
            .filter(
              (msg) => (msg.conversation?._id || msg.conversation) === convo._id
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0];

          console.log(
            `chatSlice: Updating last message for conversation ${convo._id} after deletion.`
          );
          return {
            ...convo,
            lastMessage: newLastMessage || null, // Set to new last message or null
          };
        }
        return convo;
      });
    },
    // Toggles the visibility of the emoji picker UI
    toggleEmojiPicker: (state) => {
      state.showEmojiPicker = !state.showEmojiPicker;
      console.log("chatSlice: Emoji picker toggled to:", state.showEmojiPicker);
    },
    // Closes the emoji picker UI
    closeEmojiPicker: (state) => {
      state.showEmojiPicker = false;
      console.log("chatSlice: Emoji picker closed.");
    },
  },
  // Extra reducers handle actions dispatched by `createAsyncThunk` functions
  extraReducers: (builder) => {
    builder
      // --- fetchConversations ---
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
        state.error = null;
        console.log("chatSlice: fetchConversations pending.");
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedConversations = action.payload; // Already processed by thunk for consistent format
        state.conversations = updatedConversations;
        state.error = null;
        console.log(
          "chatSlice: fetchConversations fulfilled. Total conversations:",
          updatedConversations.length
        );

        // Update active conversation with latest data if it exists in the fetched list
        if (state.activeConversation && state.activeConversation.id) {
          const matchedConvo = updatedConversations.find(
            (conv) => conv._id === state.activeConversation.id
          );
          if (matchedConvo) {
            // Merge new data while preserving existing UI-specific props if necessary
            state.activeConversation = {
              ...state.activeConversation,
              ...matchedConvo, // Overlay with fresh data from DB
              id: matchedConvo._id, // Ensure consistent ID after merge
              participants:
                matchedConvo.users || matchedConvo.participants || [], // Ensure participants are updated
            };
            console.log(
              "chatSlice: Active conversation updated with fresh data."
            );
          } else {
            // If the previously active conversation is no longer in the list (e.g., user left it)
            state.activeConversation = null;
            console.log(
              "chatSlice: Active conversation no longer found in fetched list, setting to null."
            );
          }
        }
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error(
          "chatSlice: fetchConversations rejected:",
          action.payload
        );
      })

      // --- fetchMessages ---
      .addCase(fetchMessages.pending, (state) => {
        state.status = "loading";
        state.error = null;
        console.log("chatSlice: fetchMessages pending.");
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages = action.payload; // Replace messages for the new active chat
        state.error = null;
        console.log(
          "chatSlice: fetchMessages fulfilled. Messages loaded:",
          action.payload.length
        );
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.messages = []; // Clear messages on fetch failure to prevent stale data
        console.error("chatSlice: fetchMessages rejected:", action.payload);
      })

      // --- sendMessage (handles client-side initiation of socket emit) ---
      // Note: The actual message adding to `state.messages` and `lastMessage` update
      // is primarily handled by the `addMessage` reducer when the 'receive message'
      // socket event comes from the backend.
      .addCase(sendMessage.pending, (state) => {
        state.status = "sending_message"; // A specific status for message sending initiation
        state.error = null;
        console.log(
          "chatSlice: sendMessage pending (client initiating socket event)."
        );
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = "succeeded"; // Or 'message_sent_initiated' to differentiate from 'delivered'
        state.error = null;
        console.log(
          "chatSlice: sendMessage fulfilled (socket event acknowledged by server)."
        );
        // No direct message addition here as it will be added by `addMessage` reducer upon socket reception.
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error(
          "chatSlice: sendMessage rejected (client-side error emitting socket):",
          action.payload
        );
        // Implement logic to visually mark the temporary message as failed in the UI if needed
      })

      // --- sendFileMessage (still uses API directly) ---
      .addCase(sendFileMessage.pending, (state) => {
        state.status = "loading"; // Indicate loading specifically for file uploads
        state.error = null;
        console.log("chatSlice: sendFileMessage pending.");
      })
      .addCase(sendFileMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        // The message should be added to the messages list and conversation updated.
        // If your API already returns a populated message, the `addMessage` reducer could handle it.
        state.error = null;
        console.log("chatSlice: sendFileMessage fulfilled.");
      })
      .addCase(sendFileMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error("chatSlice: sendFileMessage rejected:", action.payload);
      })

      // --- createConversation ---
      .addCase(createConversation.pending, (state) => {
        state.status = "loading";
        state.error = null;
        console.log("chatSlice: createConversation pending.");
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        const newConvo = action.payload;
        // Check if conversation already exists to prevent duplicates (in case of race conditions)
        const exists = state.conversations.some((c) => c._id === newConvo._id);
        if (!exists) {
          state.conversations.unshift(newConvo); // Add to the top if it's genuinely new
        } else {
          // If it exists, ensure it's at the top (most recent) by reordering
          state.conversations = [
            newConvo,
            ...state.conversations.filter((c) => c._id !== newConvo._id),
          ];
        }
        state.activeConversation = {
          id: newConvo._id,
          name: newConvo.name,
          picture: newConvo.picture,
          isGroup: newConvo.isGroup || false,
          otherUser: newConvo.otherUser,
          // admin and participants should be handled by the thunk's payload already
        };
        state.error = null;
        console.log(
          "chatSlice: createConversation fulfilled. New conversation:",
          newConvo.name
        );
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error(
          "chatSlice: createConversation rejected:",
          action.payload
        );
      })

      // --- createGroupConversation ---
      .addCase(createGroupConversation.pending, (state) => {
        state.status = "loading";
        state.groupCreationLoading = true;
        state.error = null;
        console.log("chatSlice: createGroupConversation pending.");
      })
      .addCase(createGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.groupCreationLoading = false;
        const newGroup = action.payload;
        const exists = state.conversations.some((c) => c._id === newGroup._id);
        if (!exists) {
          state.conversations.unshift(newGroup); // Add new group to top
        } else {
          // If it exists, update it and move to top
          state.conversations = [
            newGroup,
            ...state.conversations.filter((c) => c._id !== newGroup._id),
          ];
        }
        state.activeConversation = {
          id: newGroup._id,
          name: newGroup.name,
          picture: newGroup.picture,
          isGroup: true,
          admin: newGroup.admin, // Ensure admin is passed through
          participants: newGroup.participants,
        };
        state.error = null;
        console.log(
          "chatSlice: createGroupConversation fulfilled. New group:",
          newGroup.name
        );
      })
      .addCase(createGroupConversation.rejected, (state, action) => {
        state.status = "failed";
        state.groupCreationLoading = false;
        state.error = action.payload;
        console.error(
          "chatSlice: createGroupConversation rejected:",
          action.payload
        );
      })

      // --- searchUsers ---
      .addCase(searchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
        console.log("chatSlice: searchUsers pending.");
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.searchResults = action.payload;
        // Cache fetched user data from search results
        action.payload.forEach((user) => {
          if (user && user._id) state.userCache[user._id] = { ...user };
        });
        state.error = null;
        console.log(
          "chatSlice: searchUsers fulfilled. Results:",
          action.payload.length
        );
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.searchResults = []; // Clear results on failure
        console.error("chatSlice: searchUsers rejected:", action.payload);
      })

      // --- getAllUsers ---
      .addCase(getAllUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
        console.log("chatSlice: getAllUsers pending.");
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.users = action.payload;
        // Cache all fetched users
        action.payload.forEach((user) => {
          if (user && user._id) state.userCache[user._id] = { ...user };
        });
        state.error = null;
        console.log(
          "chatSlice: getAllUsers fulfilled. Total users:",
          action.payload.length
        );
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error("chatSlice: getAllUsers rejected:", action.payload);
      })

      // --- fetchUserById ---
      .addCase(fetchUserById.fulfilled, (state, action) => {
        // User data is already cached by the thunk itself, no explicit state update here
        console.log(
          "chatSlice: fetchUserById fulfilled for:",
          action.payload._id
        );
      })
      // No rejected/pending cases needed as this is a background fetch for caching

      // --- updateConversationDetails ---
      .addCase(updateConversationDetails.fulfilled, (state, action) => {
        const updatedConvo = action.payload;
        const index = state.conversations.findIndex(
          (c) => c._id === updatedConvo._id
        );
        if (index !== -1) {
          Object.assign(state.conversations[index], updatedConvo); // Update in place
        }
        // Also update the active conversation if it's the one being modified
        if (state.activeConversation?.id === updatedConvo._id) {
          state.activeConversation = {
            ...state.activeConversation,
            ...updatedConvo,
          };
        }
        console.log(
          "chatSlice: updateConversationDetails fulfilled for:",
          updatedConvo._id
        );
      })

      // --- addUserToGroup ---
      .addCase(addUserToGroup.pending, (state) => {
        state.status = "loading";
        console.log("chatSlice: addUserToGroup pending.");
      })
      .addCase(addUserToGroup.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedConvo = action.payload;
        const index = state.conversations.findIndex(
          (c) => c._id === updatedConvo._id
        );
        if (index !== -1) {
          Object.assign(state.conversations[index], updatedConvo);
        }
        if (state.activeConversation?.id === updatedConvo._id) {
          state.activeConversation = {
            ...state.activeConversation,
            ...updatedConvo,
          };
        }
        console.log(
          "chatSlice: addUserToGroup fulfilled for:",
          updatedConvo._id
        );
      })
      .addCase(addUserToGroup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error("chatSlice: addUserToGroup rejected:", action.payload);
      })

      // --- removeUserFromGroup ---
      .addCase(removeUserFromGroup.pending, (state) => {
        state.status = "loading";
        console.log("chatSlice: removeUserFromGroup pending.");
      })
      .addCase(removeUserFromGroup.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedConvo = action.payload;
        const index = state.conversations.findIndex(
          (c) => c._id === updatedConvo._id
        );
        if (index !== -1) {
          Object.assign(state.conversations[index], updatedConvo);
        }
        if (state.activeConversation?.id === updatedConvo._id) {
          state.activeConversation = {
            ...state.activeConversation,
            ...updatedConvo,
          };
        }
        console.log(
          "chatSlice: removeUserFromGroup fulfilled for:",
          updatedConvo._id
        );
      })
      .addCase(removeUserFromGroup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error(
          "chatSlice: removeUserFromGroup rejected:",
          action.payload
        );
      })

      // --- leaveGroup ---
      .addCase(leaveGroup.pending, (state) => {
        state.status = "loading";
        console.log("chatSlice: leaveGroup pending.");
      })
      .addCase(leaveGroup.fulfilled, (state, action) => {
        state.status = "succeeded";
        const leftConvo = action.payload;
        // Filter out the left conversation from the list
        state.conversations = state.conversations.filter(
          (c) => c._id !== leftConvo._id
        );
        // If the left conversation was the active one, clear it
        if (state.activeConversation?.id === leftConvo._id) {
          state.activeConversation = null;
        }
        console.log("chatSlice: leaveGroup fulfilled for:", leftConvo._id);
      })
      .addCase(leaveGroup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error("chatSlice: leaveGroup rejected:", action.payload);
      })

      // --- refreshConversation ---
      .addCase(refreshConversation.fulfilled, (state, action) => {
        if (action.payload && action.payload._id) {
          const refreshedConvo = action.payload;
          const index = state.conversations.findIndex(
            (c) => c._id === refreshedConvo._id
          );
          if (index !== -1) {
            Object.assign(state.conversations[index], refreshedConvo); // Update in place
          }
          if (state.activeConversation?.id === refreshedConvo._id) {
            state.activeConversation = {
              ...state.activeConversation,
              ...refreshedConvo,
            };
          }
          console.log(
            "chatSlice: refreshConversation fulfilled for:",
            refreshedConvo._id
          );
        }
      })

      // --- deleteMessage (client-side API call) ---
      // Note: The message removal from `state.messages` and `lastMessage` update
      // is primarily handled by the `handleMessageDeleted` reducer, which listens
      // to the 'message deleted' socket event from the backend.
      .addCase(deleteMessage.pending, (state) => {
        state.status = "loading"; // Or 'deleting_message'
        state.error = null;
        console.log(
          "chatSlice: deleteMessage pending (client initiating API call)."
        );
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        console.log(
          "chatSlice: deleteMessage fulfilled (API confirmed deletion)."
        );
        // Actual removal handled by `handleMessageDeleted` reducer on socket event.
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        console.error("chatSlice: deleteMessage rejected:", action.payload);
      });
  },
});

// Export actions generated by createSlice
export const {
  clearMessages,
  setIsTyping,
  setActiveConversation,
  setCurrentCall,
  addMessage,
  replaceFileMessage,
  setOnlineUsers,
  updateMessageStatus,
  cacheUserData,
  setConversations,
  updateConversationLastMessage,
  updateConversationInList,
  toggleEmojiPicker,
  closeEmojiPicker,
  handleMessageDeleted,
} = chatSlice.actions;

// Export the reducer
export default chatSlice.reducer;
