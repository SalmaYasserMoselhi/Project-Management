import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { checkAuthStatus as checkAuth } from "../authSlice/loginSlice";
import Cookies from "js-cookie";

// Re-export checkAuthStatus
export const checkAuthStatus = checkAuth;

const API_BASE_URL = "http://localhost:3000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  credentials: "include",
});

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if we're not already on the login page to avoid redirect loops
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const jwt = document.cookie
      .split("; ")
      .find((row) => row.startsWith("jwt="))
      ?.split("=")[1];

    if (jwt) {
      config.headers.Authorization = `Bearer ${jwt}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const initialState = {
  conversations: [],
  users: [],
  searchResults: [],
  status: "idle",
  error: null,
  retryAfter: null,
  activeConversation: null,
  currentCall: null,
  messages: [],
  onlineUsers: [],
  userCache: {},
  loading: false,
  groupCreationLoading: false,
  showEmojiPicker: false, // Add new state for emoji picker visibility
};

// Async Thunks
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log("Starting fetchConversations");
      const response = await api.get("/conversations");
      console.log("FULL API RESPONSE:", response);

      let conversationsData = [];

      if (response.data) {
        if (response.data.status === "success" && response.data.data) {
          conversationsData = response.data.data.conversations || [];
        } else if (response.data.data) {
          conversationsData = response.data.data;
        } else if (Array.isArray(response.data)) {
          conversationsData = response.data;
        }
      }

      // التأكد من أن البيانات صحيحة
      if (!Array.isArray(conversationsData)) {
        console.error("Invalid conversations data format:", conversationsData);
        return rejectWithValue("Invalid response format from server");
      }

      // معالجة المحادثات وتوحيد الخصائص
      const processedConversations = conversationsData
        .filter((conversation) => conversation && conversation._id)
        .map((conversation) => ({
          ...conversation,
          isGroup: conversation.isGroup === true,
          name:
            conversation.name || (conversation.isGroup ? "Group Chat" : "Chat"),
          picture:
            conversation.picture ||
            (conversation.isGroup
              ? "https://image.pngaaa.com/78/6179078-middle.png"
              : conversation.users?.[0]?.avatar || "default.jpg"),
        }));

      console.log("Processed conversations:", processedConversations);
      return processedConversations;
    } catch (error) {
      console.error("ERROR fetching conversations:", error);
      return rejectWithValue(error.message || "Failed to fetch conversations");
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/message/${conversationId}`);
      console.log("Fetched messages:", response);
      return response.data.data.messages;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch messages"
      );
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, content, isEmoji }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/message`, {
        message: content,
        convoId: conversationId,
        files: [],
        isEmoji: isEmoji || false, // Add isEmoji flag to indicate if this is an emoji message
      });
      console.log("Message sent:", response);
      return response.data.data.populatedMessage;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send message"
      );
    }
  }
);

export const sendFileMessage = createAsyncThunk(
  "chat/sendFileMessage",
  async ({ conversationId, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "file");

      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.message;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send file"
      );
    }
  }
);

export const createConversation = createAsyncThunk(
  "chat/createConversation",
  async (userId, { rejectWithValue, getState, dispatch }) => {
    try {
      if (!userId) {
        throw new Error(
          "Please provide the user id you want to start a conversation with"
        );
      }

      // Get the user data from the state if available
      const { login, chat } = getState();
      const currentUser = login?.user;
      if (currentUser?._id === userId) {
        return rejectWithValue(
          "You cannot create a conversation with yourself."
        );
      }
      // Find the user object from our search results or users list
      let userObject =
        chat.searchResults.find((u) => u._id === userId) ||
        chat.users.find((u) => u._id === userId) ||
        chat.userCache[userId];

      // جلب بيانات المستخدم بشكل محدد للتأكد من وجود البيانات الكاملة
      let userData = null;
      try {
        const userResponse = await api.get(`/users/${userId}`);

        if (
          userResponse.data &&
          userResponse.data.data &&
          userResponse.data.data.user
        ) {
          userData = userResponse.data.data.user;
        } else if (userResponse.data && userResponse.data.data) {
          userData = userResponse.data.data;
        } else if (userResponse.data && userResponse.data._id) {
          userData = userResponse.data;
        }

        if (userData && userData._id) {
          dispatch(cacheUserData(userData));
        }
      } catch (error) {
        // استخدام البيانات المخزنة سابقاً إذا فشل الجلب
        userData = userObject;
      }

      // التأكد من وجود بيانات للمستخدم
      if (!userData && !userObject) {
        throw new Error("Could not get user data for this conversation");
      }

      // استخدام أفضل البيانات المتاحة
      const finalUserData = userData || userObject;

      // تحضير اسم المستخدم
      const userName =
        finalUserData.fullName ||
        `${finalUserData.firstName || ""} ${
          finalUserData.lastName || ""
        }`.trim() ||
        finalUserData.username ||
        finalUserData.email ||
        "User";

      // تحضير صورة المستخدم
      const userPicture = finalUserData.avatar || null;

      // إرسال جميع البيانات المتوفرة مع طلب إنشاء المحادثة
      const payload = {
        receiverId: userId,
        name: userName,
        conversationName: userName,
        picture: userPicture,
        avatar: userPicture,
        type: "private",
        isGroup: false,
      };

      // إرسال طلب إنشاء المحادثة
      const response = await api.post("/conversations", payload);

      // استخراج بيانات المحادثة من الاستجابة
      let conversationData = response.data;

      // التعامل مع تنسيقات الاستجابة المختلفة
      if (!conversationData._id && conversationData.data) {
        if (conversationData.data.newConvo) {
          conversationData = conversationData.data.newConvo;
        } else if (conversationData.data._id) {
          conversationData = conversationData.data;
        } else if (typeof conversationData.data === "object") {
          conversationData = conversationData.data;
        }
      }

      // التأكد من وجود معرف للمحادثة
      if (!conversationData || !conversationData._id) {
        throw new Error("Invalid response format from server");
      }

      // إضافة بيانات المستخدم الآخر للمحادثة لاستخدامها في واجهة المستخدم
      const enhancedConversation = {
        ...conversationData,
        name: userName,
        picture: userPicture,
        otherUser: finalUserData,
      };

      // تحديث قائمة المحادثات بعد فترة قصيرة
      setTimeout(() => {
        dispatch(fetchConversations());
      }, 1000);

      return enhancedConversation;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create conversation"
      );
    }
  }
);

export const createGroupConversation = createAsyncThunk(
  "chat/createGroupConversation",
  async (groupData, { getState, rejectWithValue, dispatch }) => {
    try {
      console.log("createGroupConversation called with:", groupData);

      // Extract data from the groupData object
      const { groupName, participantIds, groupPicture } = groupData;

      // Validate inputs
      if (!groupName || groupName.trim() === "") {
        console.error("Group name is required");
        return rejectWithValue("Group name is required");
      }

      if (
        !participantIds ||
        !Array.isArray(participantIds) ||
        participantIds.length < 1
      ) {
        console.error("At least one participant is required");
        return rejectWithValue("At least one participant is required");
      }

      // Get current user from state
      const state = getState();
      const currentUser = state.login?.user;

      if (!currentUser || !currentUser._id) {
        return rejectWithValue("User must be logged in to create a group");
      }

      console.log("Current user from state:", currentUser);
      console.log("Participant IDs:", participantIds);

      // IMPORTANT: Make sure backend knows current user is admin and included
      // Make a copy of all participants including the current user
      let allParticipants = [...participantIds];

      // Make sure current user is included in the participants
      if (!allParticipants.includes(currentUser._id)) {
        allParticipants.push(currentUser._id);
      }

      console.log("All participants with current user:", allParticipants);

      // Prepare the API request data according to backend requirements
      const requestData = {
        name: groupName,
        users: allParticipants, // Send all participants INCLUDING current user
        admin: currentUser._id, // Explicitly set current user as admin
        picture: groupPicture || undefined,
      };

      console.log("Request data for creating group:", requestData);

      // Make the API request to create group
      const response = await api.post("/conversations/group", requestData);

      console.log("API response for group creation:", response.data);

      // Extract conversation data
      let conversation = null;

      if (response.data.status === "success" && response.data.data) {
        if (response.data.data.populatedConvo) {
          conversation = response.data.data.populatedConvo;
        } else if (response.data.data.conversation) {
          conversation = response.data.data.conversation;
        } else {
          conversation = response.data.data;
        }
      } else {
        conversation = response.data;
      }

      // Verify we got valid conversation data
      if (!conversation || !conversation._id) {
        console.error("Invalid conversation data returned:", conversation);
        return rejectWithValue("Invalid response from server");
      }

      console.log("Final extracted conversation:", conversation);

      // Get users from the conversation
      let users = conversation.users || [];

      // Make sure current user is included in the users list
      let currentUserIncluded = false;

      if (Array.isArray(users)) {
        // Check if current user ID is already in the users list
        currentUserIncluded = users.some((user) => {
          const userId = typeof user === "string" ? user : user?._id;
          return userId === currentUser._id;
        });
      } else {
        users = [];
      }

      // If current user is not included, add them
      if (!currentUserIncluded) {
        console.log("Adding current user to group members");
        users.push(currentUser._id);
      }

      // Create enhanced conversation with all required fields
      const enhancedConversation = {
        ...conversation,
        _id: conversation._id,
        name: conversation.name || groupName,
        picture:
          conversation.picture ||
          "https://image.pngaaa.com/78/6179078-middle.png",
        isGroup: true,
        isGroupChat: true,
        admin: conversation.admin || currentUser._id,
        users: users, // Use the updated users list with current user
        participants: users, // Set participants as well
      };

      console.log(
        "Enhanced conversation with current user:",
        enhancedConversation
      );

      // Immediately fetch conversations to update the list
      setTimeout(() => {
        dispatch(fetchConversations());
      }, 500);

      return enhancedConversation;
    } catch (error) {
      console.error("Error in createGroupConversation:", error);
      console.error("Error response:", error.response?.data);
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create group conversation"
      );
    }
  }
);

export const searchUsers = createAsyncThunk(
  "chat/searchUsers",
  async (searchTerm, { rejectWithValue, getState }) => {
    try {
      // Check auth state in Redux
      const { login } = getState();

      if (!login || !login.isAuthenticated || !login.user?._id) {
        throw new Error("Please login to search users");
      }

      // Don't perform API call for empty search term
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const currentUserId = login.user._id;

      // Encode the search term properly for URL
      const encodedSearchTerm = encodeURIComponent(searchTerm.trim());

      const response = await api.get(
        `/users/workspace-users?search=${encodedSearchTerm}&limit=20`
      );

      console.log(response);

      if (!response.data) {
        throw new Error("No data received from server");
      }

      let users = [];
      if (response.data.data && Array.isArray(response.data.data.users)) {
        users = response.data.data.users;
      } else if (Array.isArray(response.data.users)) {
        users = response.data.users;
      } else if (Array.isArray(response.data)) {
        users = response.data;
      } else {
        throw new Error("Invalid response format");
      }

      const term = searchTerm.toLowerCase().trim();
      const filteredUsers = users.filter((user) => {
        const firstName = (user.firstName || "").toLowerCase();
        const lastName = (user.lastName || "").toLowerCase();
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();

        return (
          (firstName.includes(term) ||
            lastName.includes(term) ||
            username.includes(term) ||
            email.includes(term)) &&
          user._id !== currentUserId // ما ترجعش اليوزر الحالي
        );
      });

      return filteredUsers;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to search users");
    }
  }
);
export const getAllUsers = createAsyncThunk(
  "chat/getAllUsers",
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check auth state in Redux
      const { login } = getState();

      if (!login || !login.isAuthenticated || !login.user?._id) {
        throw new Error("Please login to get users");
      }

      const currentUserId = login.user._id;

      // const response = await api.get("/users?role=user");
      const response = await api.get(`/users/workspace-users`);

      if (!response.data) {
        throw new Error("No data received from server");
      }

      let users = [];
      if (response.data.data && Array.isArray(response.data.data.users)) {
        users = response.data.data.users;
      } else if (Array.isArray(response.data.users)) {
        users = response.data.users;
      } else {
        throw new Error("Invalid response format");
      }

      // Filter out the current user
      return users.filter((user) => user._id !== currentUserId);
    } catch (error) {
      if (error.response?.status === 429) {
        return rejectWithValue(
          "Too many requests. Please wait a moment and try again."
        );
      }
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

// Add function to get data for a specific user
export const fetchUserById = createAsyncThunk(
  "chat/fetchUserById",
  async (userId, { rejectWithValue, getState, dispatch }) => {
    try {
      // Check for user ID
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Check for cached user data first
      const { chat } = getState();
      if (chat.userCache && chat.userCache[userId]) {
        return chat.userCache[userId];
      }

      const response = await api.get(`/users/${userId}`);

      // Handle different data formats
      let userData = null;

      if (response.data) {
        // Case 1: {data: {user: {...}}}
        if (response.data.data && response.data.data.user) {
          userData = response.data.data.user;
        }
        // Case 2: {user: {...}}
        else if (response.data.user) {
          userData = response.data.user;
        }
        // Case 3: Direct object
        else if (response.data._id) {
          userData = response.data;
        }
      }

      if (!userData || !userData._id) {
        throw new Error("Invalid user data received");
      }

      // Cache user data in the cache
      dispatch(cacheUserData(userData));

      return userData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user data"
      );
    }
  }
);

// Add function to update conversation details (name and picture)
export const updateConversationDetails = createAsyncThunk(
  "chat/updateConversationDetails",
  async ({ conversationId, name, picture }, { rejectWithValue }) => {
    try {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }

      // Send update request to server
      const response = await api.patch(`/conversations/${conversationId}`, {
        name,
        picture,
      });

      // Handle different response formats
      let conversationData = response.data;
      if (!conversationData || !conversationData._id) {
        if (response.data.data && response.data.data._id) {
          conversationData = response.data.data;
        } else if (
          response.data.conversation &&
          response.data.conversation._id
        ) {
          conversationData = response.data.conversation;
        }
      }

      return conversationData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update conversation"
      );
    }
  }
);

// Add feature to refresh conversation after creation
export const refreshConversation = createAsyncThunk(
  "chat/refreshConversation",
  async (conversationId, { getState, dispatch, rejectWithValue }) => {
    try {
      const { chat } = getState();
      const existingConversation = chat.conversations.find(
        (conv) => conv._id === conversationId
      );

      if (!existingConversation) {
        await dispatch(fetchConversations()).unwrap();
        return;
      }

      // Update specific conversation details
      const response = await api.get(`/conversations/${conversationId}`);

      let conversationData = null;
      if (response.data && response.data.data) {
        conversationData = response.data.data;
      } else if (response.data && response.data._id) {
        conversationData = response.data;
      }

      if (!conversationData) {
        throw new Error("Invalid conversation data received");
      }

      return conversationData;
    } catch (error) {
      return rejectWithValue("Failed to refresh conversation");
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
    },
    setIsTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    setCurrentCall: (state, action) => {
      state.currentCall = action.payload;
    },
    addMessage: (state, action) => {
      const newMessage = action.payload;
      const isSameConversation =
        newMessage.conversationId === state.activeConversation?._id;

      const alreadyExists = state.messages.some(
        (msg) => msg._id === newMessage._id
      );

      if (isSameConversation && !alreadyExists) {
        state.messages.push(newMessage);
      }
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;
      const message = state.messages.find((msg) => msg._id === messageId);
      if (message) {
        message.status = status;
      }
    },
    cacheUserData: (state, action) => {
      const user = action.payload;
      if (user && user._id) {
        state.userCache[user._id] = { ...user };
      }
    },
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    updateConversationLastMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      const convoIndex = state.conversations.findIndex(
        (c) => c._id === conversationId
      );
      if (convoIndex !== -1) {
        state.conversations[convoIndex].lastMessage = message;
      }
    },
    updateConversationInList: (state, action) => {
      const updated = action.payload;

      // تأكد إن البيانات كافية، مش بس _id
      if (!updated || !updated._id || !updated.name) {
        console.warn(
          "Skipped updateConversationInList: Incomplete data",
          updated
        );
        return;
      }

      const index = state.conversations.findIndex((c) => c._id === updated._id);

      if (index !== -1) {
        // تحديث داخلي للمرجع الحالي
        Object.assign(state.conversations[index], updated);
      } else {
        // إدخال بدون تكرار
        state.conversations = [
          updated,
          ...state.conversations.filter((c) => c._id !== updated._id),
        ];
      }
    },

    updateTypingStatus: (state, action) => {
      const { conversationId, user, isTyping } = action.payload;

      if (!state.typingUsers) {
        state.typingUsers = {};
      }

      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }

      if (isTyping) {
        // إضافة المستخدم إلى قائمة الكتابة إذا لم يكن موجودًا بالفعل
        const userExists = state.typingUsers[conversationId].some(
          (u) => u._id === user._id
        );
        if (!userExists) {
          state.typingUsers[conversationId].push(user);
        }
      } else {
        // إزالة المستخدم من قائمة الكتابة
        state.typingUsers[conversationId] = state.typingUsers[
          conversationId
        ].filter((u) => u._id !== user._id);
      }
    },
    toggleEmojiPicker: (state) => {
      state.showEmojiPicker = !state.showEmojiPicker;
    },
    closeEmojiPicker: (state) => {
      state.showEmojiPicker = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = "succeeded";

        // Force all groups to have the isGroup property set to true
        const updatedConversations = action.payload.map((conversation) => {
          if (
            conversation.isGroup === true ||
            conversation.isGroupChat === true ||
            conversation.type === "group"
          ) {
            return {
              ...conversation,
              isGroup: true,
              isGroupChat: true,
            };
          }
          return conversation;
        });

        console.log("Final conversations count:", updatedConversations.length);
        console.log(
          "Final groups count:",
          updatedConversations.filter((c) => c.isGroup === true).length
        );

        state.conversations = updatedConversations;
        state.error = null;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages = action.payload;
        state.error = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.status = "loading";
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages = [...state.messages, action.payload];
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Send file message
      .addCase(sendFileMessage.pending, (state) => {
        state.status = "loading";
      })
      .addCase(sendFileMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages = [...state.messages, action.payload];
        state.error = null;
      })
      .addCase(sendFileMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Create conversation
      .addCase(createConversation.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.status = "succeeded";

        // Save new conversation with confirmation of complete data
        const newConversation = action.payload;

        // Ensure new conversation doesn't already exist
        const existingIndex = state.conversations.findIndex(
          (c) => c._id === newConversation._id
        );

        if (existingIndex !== -1) {
          // If conversation exists, update it
          state.conversations[existingIndex] = {
            ...state.conversations[existingIndex],
            ...newConversation,
          };
        } else {
          // Add new conversation
          state.conversations = Array.isArray(state.conversations)
            ? [...state.conversations, newConversation]
            : [newConversation];
        }

        // Set active conversation
        state.activeConversation = {
          id: newConversation._id,
          name: newConversation.name,
          picture: newConversation.picture,
          isGroup: newConversation.isGroup || false,
          otherUser: newConversation.otherUser,
        };

        // Cache other user data in the cache
        if (newConversation.otherUser && newConversation.otherUser._id) {
          state.userCache[newConversation.otherUser._id] = {
            ...newConversation.otherUser,
          };
        }

        state.error = null;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Create group conversation
      .addCase(createGroupConversation.pending, (state) => {
        state.status = "loading";
        state.groupCreationLoading = true;
        state.error = null;
        console.log("Creating group conversation - pending");
      })
      .addCase(createGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.groupCreationLoading = false;

        console.log("Group conversation created successfully:", action.payload);

        // Ensure conversation has isGroup
        const enhancedPayload = {
          ...action.payload,
          isGroup: true,
          isGroupChat: true,
        };

        // Check if conversation already exists in state
        const conversationExists = state.conversations.some(
          (conv) => conv._id === enhancedPayload._id
        );

        if (!conversationExists) {
          // Add new conversation to the beginning of the array
          state.conversations = [enhancedPayload, ...state.conversations];
          console.log("Added new group conversation to state");
        } else {
          // Update existing conversation
          state.conversations = state.conversations.map((conv) =>
            conv._id === enhancedPayload._id ? enhancedPayload : conv
          );
          console.log("Updated existing group conversation in state");
        }
      })
      .addCase(createGroupConversation.rejected, (state, action) => {
        state.status = "failed";
        state.groupCreationLoading = false;
        state.error = action.payload || "Failed to create group conversation";
        console.error("Group conversation creation failed:", action.payload);
      })
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.searchResults = action.payload;

        // Cache user data from search results in the cache
        if (Array.isArray(action.payload)) {
          action.payload.forEach((user) => {
            if (user && user._id) {
              state.userCache[user._id] = { ...user };
            }
          });
        }

        state.error = null;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.searchResults = [];
      })
      // Get all users
      .addCase(getAllUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.users = action.payload;

        // Cache all user data in the cache
        if (Array.isArray(action.payload)) {
          action.payload.forEach((user) => {
            if (user && user._id) {
              state.userCache[user._id] = { ...user };
            }
          });
        }

        state.error = null;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Fetch user by ID
      .addCase(fetchUserById.pending, (state) => {
        // No need to set loading state for individual user fetch
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        const userData = action.payload;
        if (userData && userData._id) {
          state.userCache[userData._id] = { ...userData };
        }
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        // No global error state for individual user fetch failures
      })
      // Update conversation details
      .addCase(updateConversationDetails.fulfilled, (state, action) => {
        const updatedConversation = action.payload;
        if (updatedConversation && updatedConversation._id) {
          // Update conversation in conversations list
          const index = state.conversations.findIndex(
            (conv) => conv._id === updatedConversation._id
          );

          if (index !== -1) {
            state.conversations[index] = {
              ...state.conversations[index],
              ...updatedConversation,
            };
          }

          // Update active conversation if it's the same
          if (
            state.activeConversation &&
            state.activeConversation.id === updatedConversation._id
          ) {
            state.activeConversation = {
              ...state.activeConversation,
              name: updatedConversation.name,
              picture: updatedConversation.picture,
            };
          }
        }
      })
      // Add refreshConversation cases
      .addCase(refreshConversation.fulfilled, (state, action) => {
        if (action.payload && action.payload._id) {
          // Update conversation in the list
          const index = state.conversations.findIndex(
            (c) => c._id === action.payload._id
          );

          if (index !== -1) {
            state.conversations[index] = {
              ...state.conversations[index],
              ...action.payload,
            };
          }

          // Update active conversation if it's the same
          if (state.activeConversation?.id === action.payload._id) {
            state.activeConversation = {
              ...state.activeConversation,
              name: action.payload.name,
              picture: action.payload.picture,
            };
          }
        }
      });
  },
});

export const {
  clearMessages,
  setIsTyping,
  setActiveConversation,
  setCurrentCall,
  addMessage,
  setOnlineUsers,
  updateMessageStatus,
  cacheUserData,
  setConversations,
  addTestGroup,
  updateConversationLastMessage,
  updateConversationInList,
  toggleEmojiPicker,
  closeEmojiPicker,
} = chatSlice.actions;

export default chatSlice.reducer;
