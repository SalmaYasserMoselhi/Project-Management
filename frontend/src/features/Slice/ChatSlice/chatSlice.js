// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";
// import { checkAuthStatus as checkAuth } from "../authSlice/loginSlice";

// // Re-export checkAuthStatus
// export const checkAuthStatus = checkAuth;

// const API_BASE_URL = "http://localhost:3000/api/v1";

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     "Content-Type": "application/json",
//   },
//   withCredentials: true,
//   credentials: "include",
// });

// // Error handling interceptor
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error("API Error:", error);
//     if (error.response?.status === 401) {
//       // Check if we're not already on the login page to avoid redirect loops
//       if (!window.location.pathname.includes("/login")) {
//         window.location.href = "/login";
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// api.interceptors.request.use(
//   (config) => {
//     const jwt = document.cookie
//       .split("; ")
//       .find((row) => row.startsWith("jwt="))
//       ?.split("=")[1];

//     if (jwt) {
//       config.headers.Authorization = `Bearer ${jwt}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// const initialState = {
//   conversations: [],
//   users: [],
//   searchResults: [],
//   status: "idle",
//   error: null,
//   retryAfter: null,
//   activeConversation: null,
//   currentCall: null,
//   messages: [],
//   onlineUsers: [],
//   userCache: {},
// };

// // Async Thunks
// export const fetchConversations = createAsyncThunk(
//   "chat/fetchConversations",
//   async (_, { rejectWithValue, getState, dispatch }) => {
//     try {
//       console.log("Fetching conversations...");
//       const response = await api.get("/conversations");
//       console.log("Raw API response:", response);

//       // الحصول على المستخدم الحالي وبيانات المستخدمين المخزنة سابقًا
//       const { login, chat } = getState();
//       const currentUser = login?.user;
//       const userCache = chat?.userCache || {};

//       // Handle different response structures
//       let conversationsData = [];

//       if (response.data) {
//         // Case 1: {data: {conversations: [...]}}
//         if (
//           response.data.data &&
//           Array.isArray(response.data.data.conversations)
//         ) {
//           console.log("Found conversations in data.data.conversations");
//           conversationsData = response.data.data.conversations;
//         }
//         // Case 2: {conversations: [...]}
//         else if (Array.isArray(response.data.conversations)) {
//           console.log("Found conversations in data.conversations");
//           conversationsData = response.data.conversations;
//         }
//         // Case 3: Direct array response
//         else if (Array.isArray(response.data)) {
//           console.log("Found conversations in direct array");
//           conversationsData = response.data;
//         }
//         // Case 4: Special case for the backend's response format
//         else if (response.data.status === "success" && response.data.data) {
//           if (Array.isArray(response.data.data.conversations)) {
//             console.log("Found conversations in status success format");
//             conversationsData = response.data.data.conversations;
//           } else if (response.data.data.conversations) {
//             console.log(
//               "Unexpected conversation data format:",
//               response.data.data.conversations
//             );
//           }
//         }
//       }

//       console.log("Processed conversations data:", conversationsData);

//       // Return empty array if no conversations found or in unexpected format
//       if (!Array.isArray(conversationsData)) {
//         console.warn(
//           "Conversations data is not an array, returning empty array"
//         );
//         return [];
//       }

//       // سنحاول الحصول على بيانات المستخدمين الناقصة
//       const userIdsToFetch = [];

//       // استخراج معرفات المستخدمين الذين نحتاج بياناتهم
//       conversationsData.forEach((conversation) => {
//         if (conversation.isGroup) return; // تخطي المجموعات

//         // حاول العثور على معرف المستخدم الآخر
//         let otherUserId = null;

//         if (
//           conversation.participants &&
//           Array.isArray(conversation.participants)
//         ) {
//           // ابحث عن المستخدم الآخر في قائمة المشاركين
//           const otherParticipant = conversation.participants.find(
//             (p) => p._id !== currentUser?._id
//           );

//           if (otherParticipant) {
//             otherUserId = otherParticipant._id;
//           }
//         }

//         // استخدام معرف المرسل أو المستلم إذا كان متاحًا
//         if (!otherUserId) {
//           if (
//             conversation.receiverId &&
//             conversation.receiverId !== currentUser?._id
//           ) {
//             otherUserId = conversation.receiverId;
//           } else if (
//             conversation.senderId &&
//             conversation.senderId !== currentUser?._id
//           ) {
//             otherUserId = conversation.senderId;
//           }
//         }

//         // إذا وجدنا معرف المستخدم وليس لدينا بياناته في ذاكرة التخزين المؤقت، أضفه إلى قائمة الجلب
//         if (otherUserId && !userCache[otherUserId]) {
//           userIdsToFetch.push(otherUserId);
//         }
//       });

//       console.log("User IDs to fetch:", userIdsToFetch);

//       // محاولة الحصول على بيانات المستخدمين الناقصة (بشكل متوازي)
//       if (userIdsToFetch.length > 0) {
//         const fetchPromises = userIdsToFetch.map((userId) =>
//           dispatch(fetchUserById(userId))
//             .unwrap()
//             .catch((error) => {
//               console.error(`Failed to fetch user ${userId}:`, error);
//               return null;
//             })
//         );

//         // انتظار اكتمال جميع عمليات جلب بيانات المستخدمين
//         await Promise.allSettled(fetchPromises);

//         // تحديث مخزن البيانات المؤقت بعد عمليات الجلب
//         const updatedState = getState();
//         const updatedUserCache = updatedState.chat?.userCache || {};

//         console.log("Updated user cache:", updatedUserCache);
//       }

//       // معالجة كل محادثة مع استخدام بيانات المستخدمين المخزنة
//       return conversationsData
//         .map((conversation) => {
//           if (!conversation) return null;

//           // تجنب تغيير اسم المحادثة إذا كان مخزنًا في قاعدة البيانات
//           const hasCustomName =
//             conversation.name &&
//             conversation.name !== "conversation name" &&
//             conversation.name !== "Chat";
//           const hasCustomPicture =
//             conversation.picture && conversation.picture !== "default.jpg";

//           // إذا كانت هذه محادثة مجموعة، أعد بياناتها كما هي
//           if (conversation.isGroup) {
//             return {
//               ...conversation,
//               name: conversation.name || "Group Chat",
//               picture: conversation.picture || conversation.avatar || null,
//               _id: conversation._id || conversation.id,
//               lastMessage: conversation.lastMessage || {
//                 createdAt: new Date().toISOString(),
//               },
//             };
//           }

//           const conversationId = conversation._id || conversation.id;

//           // البحث عن المستخدم الآخر في المحادثة
//           let otherUserId = null;
//           let otherUser = null;

//           // أولاً: محاولة الحصول على معرف المستخدم الآخر من المشاركين
//           if (
//             conversation.participants &&
//             Array.isArray(conversation.participants)
//           ) {
//             // يتم هنا البحث عن المستخدم الآخر (غير المستخدم الحالي)
//             const otherParticipant = conversation.participants.find(
//               (p) => p._id !== currentUser?._id
//             );

//             if (otherParticipant) {
//               otherUserId = otherParticipant._id;
//               otherUser = otherParticipant; // قد يحتوي على بيانات جزئية
//             }
//           }

//           // ثانياً: استخدام معرف المستلم أو المرسل إذا كان متاحًا
//           if (!otherUserId) {
//             if (
//               conversation.receiverId &&
//               conversation.receiverId !== currentUser?._id
//             ) {
//               otherUserId = conversation.receiverId;
//             } else if (
//               conversation.senderId &&
//               conversation.senderId !== currentUser?._id
//             ) {
//               otherUserId = conversation.senderId;
//             }
//           }

//           // استخدام بيانات المستخدم المخزنة إذا كانت متاحة
//           if (otherUserId && userCache[otherUserId]) {
//             console.log(
//               `Using cached user data for ${otherUserId} in conversation ${conversationId}`
//             );
//             otherUser = userCache[otherUserId];
//           }

//           // استخدام بيانات المستخدم الآخر لتحديث اسم وصورة المحادثة
//           const updatedConversation = {
//             ...conversation,
//             _id: conversationId,
//             lastMessage: conversation.lastMessage || {
//               createdAt: new Date().toISOString(),
//             },
//           };

//           // إضافة بيانات المستخدم الآخر إلى المحادثة
//           if (otherUser) {
//             updatedConversation.otherUser = otherUser;
//           }

//           // إذا لم يكن لدينا اسم مخصص مخزن بالفعل في قاعدة البيانات، نستخدم بيانات المستخدم
//           if (!hasCustomName && otherUser) {
//             updatedConversation.name =
//               otherUser.fullName ||
//               `${otherUser.firstName || ""} ${
//                 otherUser.lastName || ""
//               }`.trim() ||
//               otherUser.username ||
//               otherUser.email ||
//               conversation.name ||
//               "Chat";
//           }

//           // إذا لم تكن لدينا صورة مخصصة مخزنة بالفعل في قاعدة البيانات، نستخدم صورة المستخدم
//           if (!hasCustomPicture && otherUser && otherUser.avatar) {
//             updatedConversation.picture = otherUser.avatar;
//           }

//           return updatedConversation;
//         })
//         .filter(Boolean); // إزالة أي قيم فارغة
//     } catch (error) {
//       console.error("Error fetching conversations:", error);
//       console.error("Error response:", error.response);
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to fetch conversations"
//       );
//     }
//   }
// );

// export const fetchMessages = createAsyncThunk(
//   "chat/fetchMessages",
//   async ({ conversationId }, { rejectWithValue }) => {
//     try {
//       const response = await api.get(
//         `/conversations/${conversationId}/messages`
//       );
//       return response.data.messages;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to fetch messages"
//       );
//     }
//   }
// );

// export const sendMessage = createAsyncThunk(
//   "chat/sendMessage",
//   async ({ conversationId, content }, { rejectWithValue }) => {
//     try {
//       const response = await api.post(
//         `/conversations/${conversationId}/messages`,
//         {
//           content,
//           type: "text",
//         }
//       );
//       return response.data.message;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to send message"
//       );
//     }
//   }
// );

// export const sendFileMessage = createAsyncThunk(
//   "chat/sendFileMessage",
//   async ({ conversationId, file }, { rejectWithValue }) => {
//     try {
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("type", "file");

//       const response = await api.post(
//         `/conversations/${conversationId}/messages`,
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         }
//       );
//       return response.data.message;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to send file"
//       );
//     }
//   }
// );

// export const createConversation = createAsyncThunk(
//   "chat/createConversation",
//   async (userId, { rejectWithValue, getState, dispatch }) => {
//     try {
//       console.log("Creating conversation with userId:", userId);

//       if (!userId) {
//         throw new Error(
//           "Please provide the user id you want to start a conversation with"
//         );
//       }

//       // Get the user data from the state if available
//       const { login, chat } = getState();
//       const currentUser = login?.user;

//       // Find the user object from our search results or users list
//       let userObject =
//         chat.searchResults.find((u) => u._id === userId) ||
//         chat.users.find((u) => u._id === userId) ||
//         chat.userCache[userId];

//       console.log("User object found in state before fetching:", userObject);

//       // جلب بيانات المستخدم بشكل محدد للتأكد من وجود البيانات الكاملة
//       let userData = null;
//       try {
//         console.log("Fetching user data before creating conversation");
//         const userResponse = await api.get(`/users/${userId}`);
//         console.log("User API Response:", userResponse);

//         if (
//           userResponse.data &&
//           userResponse.data.data &&
//           userResponse.data.data.user
//         ) {
//           userData = userResponse.data.data.user;
//         } else if (userResponse.data && userResponse.data.data) {
//           userData = userResponse.data.data;
//         } else if (userResponse.data && userResponse.data._id) {
//           userData = userResponse.data;
//         }

//         if (userData && userData._id) {
//           console.log("Successfully fetched user data:", userData);
//           dispatch(cacheUserData(userData));
//         }
//       } catch (error) {
//         console.error("Error fetching user data:", error);
//         // استخدام البيانات المخزنة سابقاً إذا فشل الجلب
//         userData = userObject;
//       }

//       // التأكد من وجود بيانات للمستخدم
//       if (!userData && !userObject) {
//         console.error("No user data available for this conversation");
//         throw new Error("Could not get user data for this conversation");
//       }

//       // استخدام أفضل البيانات المتاحة
//       const finalUserData = userData || userObject;
//       console.log("Final user data for conversation:", finalUserData);

//       // تحضير اسم المستخدم
//       const userName =
//         finalUserData.fullName ||
//         `${finalUserData.firstName || ""} ${
//           finalUserData.lastName || ""
//         }`.trim() ||
//         finalUserData.username ||
//         finalUserData.email ||
//         "User";

//       // تحضير صورة المستخدم
//       const userPicture = finalUserData.avatar || null;

//       console.log(
//         `Using name: "${userName}" and picture: ${userPicture} for conversation`
//       );

//       // إرسال جميع البيانات المتوفرة مع طلب إنشاء المحادثة
//       const payload = {
//         receiverId: userId,
//         name: userName,
//         conversationName: userName,
//         picture: userPicture,
//         avatar: userPicture,
//         type: "private",
//       };

//       console.log("Creating conversation with payload:", payload);

//       // إرسال طلب إنشاء المحادثة
//       const response = await api.post("/conversations", payload);
//       console.log("Conversation API response:", response);

//       // استخراج بيانات المحادثة من الاستجابة
//       let conversationData = response.data;

//       // التعامل مع تنسيقات الاستجابة المختلفة
//       if (!conversationData._id && conversationData.data) {
//         if (conversationData.data.newConvo) {
//           conversationData = conversationData.data.newConvo;
//         } else if (conversationData.data._id) {
//           conversationData = conversationData.data;
//         } else if (typeof conversationData.data === "object") {
//           conversationData = conversationData.data;
//         }
//       }

//       // التأكد من وجود معرف للمحادثة
//       if (!conversationData || !conversationData._id) {
//         console.error("Invalid conversation data:", conversationData);
//         throw new Error("Invalid response format from server");
//       }

//       // إضافة بيانات المستخدم الآخر للمحادثة لاستخدامها في واجهة المستخدم
//       const enhancedConversation = {
//         ...conversationData,
//         name: userName,
//         picture: userPicture,
//         otherUser: finalUserData,
//       };

//       console.log("Final enhanced conversation:", enhancedConversation);

//       // تحديث قائمة المحادثات بعد فترة قصيرة
//       setTimeout(() => {
//         dispatch(fetchConversations());
//       }, 1000);

//       return enhancedConversation;
//     } catch (error) {
//       console.error("Create conversation error:", error);
//       return rejectWithValue(
//         error.response?.data?.message ||
//           error.message ||
//           "Failed to create conversation"
//       );
//     }
//   }
// );

// export const createGroupConversation = createAsyncThunk(
//   "chat/createGroupConversation",
//   async ({ name, participants }, { rejectWithValue }) => {
//     try {
//       const response = await api.post("/conversations", {
//         type: "group",
//         name,
//         participants,
//       });

//       console.log("Group conversation API response:", response.data);

//       // Handle different response formats
//       let conversationData = response.data;

//       // Check if the data is nested
//       if (!conversationData._id && conversationData.data) {
//         // Try to get from data.newConvo
//         if (conversationData.data.newConvo) {
//           conversationData = conversationData.data.newConvo;
//         }
//         // Or from data directly if it has conversation properties
//         else if (conversationData.data._id) {
//           conversationData = conversationData.data;
//         }
//       }

//       // Ensure the conversation has an ID
//       if (!conversationData || !conversationData._id) {
//         console.error("Invalid conversation data:", conversationData);
//         throw new Error("Invalid response format from server");
//       }

//       return conversationData;
//     } catch (error) {
//       console.error("Create group conversation error:", error);
//       return rejectWithValue(
//         error.response?.data?.message ||
//           error.message ||
//           "Failed to create group"
//       );
//     }
//   }
// );

// export const searchUsers = createAsyncThunk(
//   "chat/searchUsers",
//   async (searchTerm, { rejectWithValue, getState }) => {
//     try {
//       // Check auth state in Redux
//       const { login } = getState();

//       if (!login || !login.isAuthenticated || !login.user?._id) {
//         console.error("User not authenticated in Redux state");
//         throw new Error("Please login to search users");
//       }

//       // Don't perform API call for empty search term
//       if (!searchTerm || searchTerm.trim().length === 0) {
//         return [];
//       }

//       const currentUserId = login.user._id;
//       console.log("Searching users with authenticated user ID:", currentUserId);

//       // Encode the search term properly for URL
//       const encodedSearchTerm = encodeURIComponent(searchTerm.trim());

//       // Add a limit parameter for performance
//       const response = await api.get(
//         `/users?query=${encodedSearchTerm}&role=user&limit=20`
//       );
//       console.log("Search API Response:", response);

//       if (!response.data) {
//         throw new Error("No data received from server");
//       }

//       let users = [];
//       if (response.data.data && Array.isArray(response.data.data.users)) {
//         users = response.data.data.users;
//       } else if (Array.isArray(response.data.users)) {
//         users = response.data.users;
//       } else if (Array.isArray(response.data)) {
//         users = response.data;
//       } else {
//         throw new Error("Invalid response format");
//       }

//       // Only return users that actually match the search term
//       const term = searchTerm.toLowerCase().trim();
//       const filteredUsers = users.filter((user) => {
//         const fullName = `${user.firstName || ""} ${
//           user.lastName || ""
//         }`.toLowerCase();
//         const username = (user.username || "").toLowerCase();
//         const email = (user.email || "").toLowerCase();

//         // Only include users that match the search term
//         return (
//           (fullName.includes(term) ||
//             username.includes(term) ||
//             email.includes(term)) &&
//           user._id !== currentUserId
//         );
//       });

//       return filteredUsers;
//     } catch (error) {
//       console.error("Search users error:", error);
//       return rejectWithValue(error.message || "Failed to search users");
//     }
//   }
// );

// export const getAllUsers = createAsyncThunk(
//   "chat/getAllUsers",
//   async (_, { rejectWithValue, getState }) => {
//     try {
//       // Check auth state in Redux
//       const { login } = getState();

//       if (!login || !login.isAuthenticated || !login.user?._id) {
//         console.error("User not authenticated in Redux state");
//         throw new Error("Please login to get users");
//       }

//       const currentUserId = login.user._id;
//       console.log(
//         "Getting all users with authenticated user ID:",
//         currentUserId
//       );

//       const response = await api.get("/users?role=user");
//       console.log("Get all users API Response:", response);

//       if (!response.data) {
//         throw new Error("No data received from server");
//       }

//       let users = [];
//       if (response.data.data && Array.isArray(response.data.data.users)) {
//         users = response.data.data.users;
//       } else if (Array.isArray(response.data.users)) {
//         users = response.data.users;
//       } else {
//         throw new Error("Invalid response format");
//       }

//       // Filter out the current user
//       return users.filter((user) => user._id !== currentUserId);
//     } catch (error) {
//       console.error("Get all users error:", error);
//       if (error.response?.status === 429) {
//         return rejectWithValue(
//           "Too many requests. Please wait a moment and try again."
//         );
//       }
//       return rejectWithValue(error.message || "Failed to fetch users");
//     }
//   }
// );

// // إضافة وظيفة للحصول على بيانات مستخدم محدد
// export const fetchUserById = createAsyncThunk(
//   "chat/fetchUserById",
//   async (userId, { rejectWithValue, getState, dispatch }) => {
//     try {
//       // التحقق من وجود معرف المستخدم
//       if (!userId) {
//         throw new Error("User ID is required");
//       }

//       // التحقق من مخزن المستخدمين المؤقت أولاً
//       const { chat } = getState();
//       if (chat.userCache && chat.userCache[userId]) {
//         console.log(`User ${userId} found in cache, returning cached data`);
//         return chat.userCache[userId];
//       }

//       console.log(`Fetching user data for user ID: ${userId}`);
//       const response = await api.get(`/users/${userId}`);
//       console.log("User fetch response:", response.data);

//       // معالجة مختلف تنسيقات البيانات المحتملة
//       let userData = null;

//       if (response.data) {
//         // الحالة 1: {data: {user: {...}}}
//         if (response.data.data && response.data.data.user) {
//           userData = response.data.data.user;
//         }
//         // الحالة 2: {user: {...}}
//         else if (response.data.user) {
//           userData = response.data.user;
//         }
//         // الحالة 3: الكائن مباشرة
//         else if (response.data._id) {
//           userData = response.data;
//         }
//       }

//       if (!userData || !userData._id) {
//         throw new Error("Invalid user data received");
//       }

//       // تخزين بيانات المستخدم في المخزن المؤقت
//       dispatch(cacheUserData(userData));

//       return userData;
//     } catch (error) {
//       console.error("Error fetching user:", error);
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to fetch user data"
//       );
//     }
//   }
// );

// // إضافة وظيفة لتحديث بيانات المحادثة (الاسم والصورة)
// export const updateConversationDetails = createAsyncThunk(
//   "chat/updateConversationDetails",
//   async ({ conversationId, name, picture }, { rejectWithValue }) => {
//     try {
//       if (!conversationId) {
//         throw new Error("Conversation ID is required");
//       }

//       console.log(
//         `Updating conversation ${conversationId} with name: ${name} and picture: ${picture}`
//       );

//       // إرسال طلب التحديث للخادم
//       const response = await api.patch(`/conversations/${conversationId}`, {
//         name,
//         picture,
//       });

//       // التعامل مع مختلف تنسيقات الاستجابة
//       let conversationData = response.data;
//       if (!conversationData || !conversationData._id) {
//         if (response.data.data && response.data.data._id) {
//           conversationData = response.data.data;
//         } else if (
//           response.data.conversation &&
//           response.data.conversation._id
//         ) {
//           conversationData = response.data.conversation;
//         }
//       }

//       return conversationData;
//     } catch (error) {
//       console.error("Error updating conversation:", error);
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to update conversation"
//       );
//     }
//   }
// );

// // إضافة خاصية لتحديث عرض المحادثات بعد إنشائها
// export const refreshConversation = createAsyncThunk(
//   "chat/refreshConversation",
//   async (conversationId, { getState, dispatch, rejectWithValue }) => {
//     try {
//       console.log(`Refreshing conversation ${conversationId}`);

//       const { chat } = getState();
//       const existingConversation = chat.conversations.find(
//         (conv) => conv._id === conversationId
//       );

//       if (!existingConversation) {
//         console.log(
//           "Conversation not found in state, fetching all conversations"
//         );
//         await dispatch(fetchConversations()).unwrap();
//         return;
//       }

//       // تحديث تفاصيل المحادثة المحددة
//       const response = await api.get(`/conversations/${conversationId}`);

//       let conversationData = null;
//       if (response.data && response.data.data) {
//         conversationData = response.data.data;
//       } else if (response.data && response.data._id) {
//         conversationData = response.data;
//       }

//       if (!conversationData) {
//         throw new Error("Invalid conversation data received");
//       }

//       return conversationData;
//     } catch (error) {
//       console.error("Error refreshing conversation:", error);
//       return rejectWithValue("Failed to refresh conversation");
//     }
//   }
// );

// const chatSlice = createSlice({
//   name: "chat",
//   initialState,
//   reducers: {
//     clearMessages: (state) => {
//       state.messages = [];
//     },
//     setIsTyping: (state, action) => {
//       state.isTyping = action.payload;
//     },
//     setActiveConversation: (state, action) => {
//       state.activeConversation = action.payload;
//     },
//     setCurrentCall: (state, action) => {
//       state.currentCall = action.payload;
//     },
//     addMessage: (state, action) => {
//       if (action.payload.conversationId === state.activeConversation?._id) {
//         state.messages = [...state.messages, action.payload];
//       }
//     },
//     setOnlineUsers: (state, action) => {
//       state.onlineUsers = action.payload;
//     },
//     updateMessageStatus: (state, action) => {
//       const { messageId, status } = action.payload;
//       const message = state.messages.find((msg) => msg._id === messageId);
//       if (message) {
//         message.status = status;
//       }
//     },
//     cacheUserData: (state, action) => {
//       const user = action.payload;
//       if (user && user._id) {
//         state.userCache[user._id] = { ...user };
//       }
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // Fetch conversations
//       .addCase(fetchConversations.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(fetchConversations.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.conversations = action.payload;
//         state.error = null;
//       })
//       .addCase(fetchConversations.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Fetch messages
//       .addCase(fetchMessages.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(fetchMessages.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.messages = action.payload;
//         state.error = null;
//       })
//       .addCase(fetchMessages.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Send message
//       .addCase(sendMessage.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(sendMessage.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.messages = [...state.messages, action.payload];
//         state.error = null;
//       })
//       .addCase(sendMessage.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Send file message
//       .addCase(sendFileMessage.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(sendFileMessage.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.messages = [...state.messages, action.payload];
//         state.error = null;
//       })
//       .addCase(sendFileMessage.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Create conversation
//       .addCase(createConversation.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(createConversation.fulfilled, (state, action) => {
//         state.status = "succeeded";

//         // حفظ المحادثة الجديدة مع التأكد من وجود البيانات الكاملة
//         const newConversation = action.payload;

//         // تأكد من أن المحادثة ليست موجودة بالفعل
//         const existingIndex = state.conversations.findIndex(
//           (c) => c._id === newConversation._id
//         );

//         if (existingIndex !== -1) {
//           // إذا كانت المحادثة موجودة، قم بتحديثها
//           state.conversations[existingIndex] = {
//             ...state.conversations[existingIndex],
//             ...newConversation,
//           };
//         } else {
//           // إضافة المحادثة الجديدة
//           state.conversations = Array.isArray(state.conversations)
//             ? [...state.conversations, newConversation]
//             : [newConversation];
//         }

//         // تعيين المحادثة النشطة
//         state.activeConversation = {
//           id: newConversation._id,
//           name: newConversation.name,
//           picture: newConversation.picture,
//           isGroup: newConversation.isGroup || false,
//           otherUser: newConversation.otherUser,
//         };

//         // تخزين بيانات المستخدم الآخر في المخزن المؤقت
//         if (newConversation.otherUser && newConversation.otherUser._id) {
//           state.userCache[newConversation.otherUser._id] = {
//             ...newConversation.otherUser,
//           };
//         }

//         state.error = null;
//       })
//       .addCase(createConversation.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Create group conversation
//       .addCase(createGroupConversation.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(createGroupConversation.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.conversations = Array.isArray(state.conversations)
//           ? [...state.conversations, action.payload]
//           : [action.payload];
//         state.activeConversation = action.payload;
//         state.error = null;
//       })
//       .addCase(createGroupConversation.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Search users
//       .addCase(searchUsers.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(searchUsers.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.searchResults = action.payload;

//         // تخزين بيانات المستخدمين من نتائج البحث في المخزن المؤقت
//         if (Array.isArray(action.payload)) {
//           action.payload.forEach((user) => {
//             if (user && user._id) {
//               state.userCache[user._id] = { ...user };
//             }
//           });
//         }

//         state.error = null;
//       })
//       .addCase(searchUsers.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//         state.searchResults = [];
//       })
//       // Get all users
//       .addCase(getAllUsers.pending, (state) => {
//         state.status = "loading";
//       })
//       .addCase(getAllUsers.fulfilled, (state, action) => {
//         state.status = "succeeded";
//         state.users = action.payload;

//         // تخزين بيانات جميع المستخدمين في المخزن المؤقت
//         if (Array.isArray(action.payload)) {
//           action.payload.forEach((user) => {
//             if (user && user._id) {
//               state.userCache[user._id] = { ...user };
//             }
//           });
//         }

//         state.error = null;
//       })
//       .addCase(getAllUsers.rejected, (state, action) => {
//         state.status = "failed";
//         state.error = action.payload;
//       })
//       // Fetch user by ID
//       .addCase(fetchUserById.pending, (state) => {
//         // No need to set loading state for individual user fetch
//       })
//       .addCase(fetchUserById.fulfilled, (state, action) => {
//         const userData = action.payload;
//         if (userData && userData._id) {
//           state.userCache[userData._id] = { ...userData };
//         }
//       })
//       .addCase(fetchUserById.rejected, (state, action) => {
//         // No global error state for individual user fetch failures
//         console.error("Failed to fetch user:", action.payload);
//       })
//       // Update conversation details
//       .addCase(updateConversationDetails.fulfilled, (state, action) => {
//         const updatedConversation = action.payload;
//         if (updatedConversation && updatedConversation._id) {
//           // تحديث المحادثة في قائمة المحادثات
//           const index = state.conversations.findIndex(
//             (conv) => conv._id === updatedConversation._id
//           );

//           if (index !== -1) {
//             state.conversations[index] = {
//               ...state.conversations[index],
//               ...updatedConversation,
//             };
//           }

//           // تحديث المحادثة النشطة إذا كانت هي نفسها
//           if (
//             state.activeConversation &&
//             state.activeConversation.id === updatedConversation._id
//           ) {
//             state.activeConversation = {
//               ...state.activeConversation,
//               name: updatedConversation.name,
//               picture: updatedConversation.picture,
//             };
//           }
//         }
//       })
//       // Add refreshConversation cases
//       .addCase(refreshConversation.fulfilled, (state, action) => {
//         if (action.payload && action.payload._id) {
//           // تحديث المحادثة في القائمة
//           const index = state.conversations.findIndex(
//             (c) => c._id === action.payload._id
//           );

//           if (index !== -1) {
//             state.conversations[index] = {
//               ...state.conversations[index],
//               ...action.payload,
//             };
//           }

//           // تحديث المحادثة النشطة إذا كانت هي نفسها
//           if (state.activeConversation?.id === action.payload._id) {
//             state.activeConversation = {
//               ...state.activeConversation,
//               name: action.payload.name,
//               picture: action.payload.picture,
//             };
//           }
//         }
//       });
//   },
// });

// export const {
//   clearMessages,
//   setIsTyping,
//   setActiveConversation,
//   setCurrentCall,
//   addMessage,
//   setOnlineUsers,
//   updateMessageStatus,
//   cacheUserData,
// } = chatSlice.actions;

// export default chatSlice.reducer;

//2
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { checkAuthStatus as checkAuth } from "../authSlice/loginSlice";

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
};

// Async Thunks
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue, getState, dispatch }) => {
    try {
      const response = await api.get("/conversations");

      // الحصول على المستخدم الحالي وبيانات المستخدمين المخزنة سابقًا
      const { login, chat } = getState();
      const currentUser = login?.user;
      const userCache = chat?.userCache || {};

      // Handle different response structures
      let conversationsData = [];

      if (response.data) {
        // Case 1: {data: {conversations: [...]}}
        if (
          response.data.data &&
          Array.isArray(response.data.data.conversations)
        ) {
          conversationsData = response.data.data.conversations;
        }
        // Case 2: {conversations: [...]}
        else if (Array.isArray(response.data.conversations)) {
          conversationsData = response.data.conversations;
        }
        // Case 3: Direct array response
        else if (Array.isArray(response.data)) {
          conversationsData = response.data;
        }
        // Case 4: Special case for the backend's response format
        else if (response.data.status === "success" && response.data.data) {
          if (Array.isArray(response.data.data.conversations)) {
            conversationsData = response.data.data.conversations;
          } else if (response.data.data.conversations) {
          }
        }
      }

      // سنحاول الحصول على بيانات المستخدمين الناقصة
      const userIdsToFetch = [];

      // استخراج معرفات المستخدمين الذين نحتاج بياناتهم
      conversationsData.forEach((conversation) => {
        if (conversation.isGroup || conversation.isGroupChat) {
          return; // تخطي المجموعات
        }

        // حاول العثور على معرف المستخدم الآخر
        let otherUserId = null;

        if (
          conversation.participants &&
          Array.isArray(conversation.participants)
        ) {
          // ابحث عن المستخدم الآخر في قائمة المشاركين
          const otherParticipant = conversation.participants.find(
            (p) => p._id !== currentUser?._id
          );

          if (otherParticipant) {
            otherUserId = otherParticipant._id;
          }
        }

        // استخدام معرف المرسل أو المستلم إذا كان متاحًا
        if (!otherUserId) {
          if (
            conversation.receiverId &&
            conversation.receiverId !== currentUser?._id
          ) {
            otherUserId = conversation.receiverId;
          } else if (
            conversation.senderId &&
            conversation.senderId !== currentUser?._id
          ) {
            otherUserId = conversation.senderId;
          }
        }

        // إذا وجدنا معرف المستخدم وليس لدينا بياناته في ذاكرة التخزين المؤقت، أضفه إلى قائمة الجلب
        if (otherUserId && !userCache[otherUserId]) {
          userIdsToFetch.push(otherUserId);
        }
      });

      // محاولة الحصول على بيانات المستخدمين الناقصة (بشكل متوازي)
      if (userIdsToFetch.length > 0) {
        const fetchPromises = userIdsToFetch.map((userId) =>
          dispatch(fetchUserById(userId))
            .unwrap()
            .catch((error) => {
              return null;
            })
        );

        // انتظار اكتمال جميع عمليات جلب بيانات المستخدمين
        await Promise.allSettled(fetchPromises);

        // تحديث مخزن البيانات المؤقت بعد عمليات الجلب
        const updatedState = getState();
        const updatedUserCache = updatedState.chat?.userCache || {};
      }

      // معالجة كل محادثة مع استخدام بيانات المستخدمين المخزنة
      return conversationsData
        .map((conversation) => {
          if (!conversation) return null;

          // تجنب تغيير اسم المحادثة إذا كان مخزنًا في قاعدة البيانات
          const hasCustomName =
            conversation.name &&
            conversation.name !== "conversation name" &&
            conversation.name !== "Chat";
          const hasCustomPicture =
            conversation.picture && conversation.picture !== "default.jpg";

          // إذا كانت هذه محادثة مجموعة، أعد بياناتها كما هي
          if (
            conversation.isGroup ||
            conversation.isGroupChat ||
            conversation.type === "group"
          ) {
            return {
              ...conversation,
              name: conversation.name || "Group Chat",
              picture: conversation.picture || conversation.avatar || null,
              _id: conversation._id || conversation.id,
              isGroup: true,
              lastMessage: conversation.lastMessage || {
                createdAt: new Date().toISOString(),
              },
            };
          }

          const conversationId = conversation._id || conversation.id;

          // البحث عن المستخدم الآخر في المحادثة
          let otherUserId = null;
          let otherUser = null;

          // أولاً: محاولة الحصول على معرف المستخدم الآخر من المشاركين
          if (
            conversation.participants &&
            Array.isArray(conversation.participants)
          ) {
            // يتم هنا البحث عن المستخدم الآخر (غير المستخدم الحالي)
            const otherParticipant = conversation.participants.find(
              (p) => p._id !== currentUser?._id
            );

            if (otherParticipant) {
              otherUserId = otherParticipant._id;
              otherUser = otherParticipant; // قد يحتوي على بيانات جزئية
            }
          }

          // ثانياً: استخدام معرف المستلم أو المرسل إذا كان متاحًا
          if (!otherUserId) {
            if (
              conversation.receiverId &&
              conversation.receiverId !== currentUser?._id
            ) {
              otherUserId = conversation.receiverId;
            } else if (
              conversation.senderId &&
              conversation.senderId !== currentUser?._id
            ) {
              otherUserId = conversation.senderId;
            }
          }

          // استخدام بيانات المستخدم المخزنة إذا كانت متاحة
          if (otherUserId && userCache[otherUserId]) {
            otherUser = userCache[otherUserId];
          }

          // استخدام بيانات المستخدم الآخر لتحديث اسم وصورة المحادثة
          const updatedConversation = {
            ...conversation,
            _id: conversationId,
            lastMessage: conversation.lastMessage || {
              createdAt: new Date().toISOString(),
            },
          };

          // إضافة بيانات المستخدم الآخر إلى المحادثة
          if (otherUser) {
            updatedConversation.otherUser = otherUser;
          }

          // إذا لم يكن لدينا اسم مخصص مخزن بالفعل في قاعدة البيانات، نستخدم بيانات المستخدم
          if (!hasCustomName && otherUser) {
            updatedConversation.name =
              otherUser.fullName ||
              `${otherUser.firstName || ""} ${
                otherUser.lastName || ""
              }`.trim() ||
              otherUser.username ||
              otherUser.email ||
              conversation.name ||
              "Chat";
          }

          // إذا لم تكن لدينا صورة مخصصة مخزنة بالفعل في قاعدة البيانات، نستخدم صورة المستخدم
          if (!hasCustomPicture && otherUser && otherUser.avatar) {
            updatedConversation.picture = otherUser.avatar;
          }

          return updatedConversation;
        })
        .filter(Boolean); // إزالة أي قيم فارغة
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch conversations"
      );
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/conversations/${conversationId}/messages`
      );
      return response.data.messages;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch messages"
      );
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, content }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        {
          content,
          type: "text",
        }
      );
      return response.data.message;
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
  async (
    { groupName, participants, currentUserId, groupPicture },
    thunkAPI
  ) => {
    try {
      // التحقق من وجود اسم المجموعة والمشاركين
      if (!groupName || !groupName.trim()) {
        return thunkAPI.rejectWithValue("Group name is required");
      }

      if (
        !participants ||
        !Array.isArray(participants) ||
        participants.length < 1
      ) {
        return thunkAPI.rejectWithValue("At least one participant is required");
      }

      // Get current state to access user data
      const state = thunkAPI.getState();
      const { chat, login } = state;

      // Get current user data
      const currentUser = login.user;
      if (!currentUser || !currentUser._id) {
        return thunkAPI.rejectWithValue("User not authenticated");
      }

      // التأكد من إضافة المستخدم الحالي للمشاركين إذا لم يكن موجودًا
      const participantIds = [...participants];
      if (currentUserId && !participantIds.includes(currentUserId)) {
        participantIds.push(currentUserId);
      }

      // Retrieve complete participant data from various sources
      const participantData = [];
      for (const userId of participantIds) {
        // First check if user data exists in userCache
        if (chat.userCache && chat.userCache[userId]) {
          participantData.push(chat.userCache[userId]);
          continue;
        }

        // Then check search results
        if (Array.isArray(chat.searchResults)) {
          const userFromSearch = chat.searchResults.find(
            (u) => u._id === userId
          );
          if (userFromSearch) {
            participantData.push(userFromSearch);
            continue;
          }
        }

        // Then check all users list
        if (Array.isArray(chat.users)) {
          const userFromList = chat.users.find((u) => u._id === userId);
          if (userFromList) {
            participantData.push(userFromList);
            continue;
          }
        }

        // If not found, add just the ID
        participantData.push({ _id: userId });
      }

      // إعداد بيانات الطلب
      const groupData = {
        name: groupName.trim(),
        receiverId: participantIds[0],
        participants: participantIds,
        type: "group",
      };

      let response;

      try {
        // إرسال طلب إنشاء المجموعة
        response = await api.post(`/conversations`, groupData);
      } catch (firstError) {
        // محاولة ثانية باستخدام توكن مباشر
        try {
          const jwt =
            document.cookie
              .split("; ")
              .find((row) => row.startsWith("jwt="))
              ?.split("=")[1] || localStorage.getItem("token");

          response = await axios.post(
            `${API_BASE_URL}/conversations`,
            groupData,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
              },
            }
          );
        } catch (secondError) {
          throw secondError;
        }
      }

      // معالجة استجابة الخادم
      let newConversation = null;
      if (response.data && response.data.status === "success") {
        // تنسيق API المتوقع من الباكيند
        if (response.data.data && response.data.data.populatedConvo) {
          newConversation = response.data.data.populatedConvo;
        } else if (response.data.data) {
          newConversation = response.data.data;
        }
      } else if (response.data && (response.data._id || response.data.id)) {
        // تنسيق API البديل
        newConversation = response.data;
      } else {
        return thunkAPI.rejectWithValue("Invalid server response");
      }

      // تأكد من وجود معرف المحادثة
      if (!newConversation._id && newConversation.id) {
        newConversation._id = newConversation.id;
      }

      // إضافة معلومات إضافية للمحادثة إذا كانت مفقودة
      const enhancedConversation = {
        ...newConversation,
        isGroup: true,
        isGroupChat: true,
        name: newConversation.name || groupName,
        picture:
          newConversation.picture ||
          groupPicture ||
          "https://via.placeholder.com/150?text=Group",
        type: "group",
        lastMessage: newConversation.lastMessage || {
          content: "Group created",
          createdAt: new Date().toISOString(),
        },
        participants:
          newConversation.users ||
          newConversation.participants ||
          participantData,
      };

      // Cache participant data in userCache
      for (const participant of participantData) {
        if (participant && participant._id) {
          thunkAPI.dispatch(cacheUserData(participant));
        }
      }

      // قم بتحديث قائمة المحادثات بعد فترة قصيرة
      setTimeout(() => {
        thunkAPI.dispatch(fetchConversations());
      }, 1000);

      return enhancedConversation;
    } catch (error) {
      return thunkAPI.rejectWithValue(
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

      // Add a limit parameter for performance
      const response = await api.get(
        `/users?query=${encodedSearchTerm}&role=user&limit=20`
      );

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

      // Only return users that actually match the search term
      const term = searchTerm.toLowerCase().trim();
      const filteredUsers = users.filter((user) => {
        const fullName = `${user.firstName || ""} ${
          user.lastName || ""
        }`.toLowerCase();
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();

        // Only include users that match the search term
        return (
          (fullName.includes(term) ||
            username.includes(term) ||
            email.includes(term)) &&
          user._id !== currentUserId
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

      const response = await api.get("/users?role=user");

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

// إضافة وظيفة للحصول على بيانات مستخدم محدد
export const fetchUserById = createAsyncThunk(
  "chat/fetchUserById",
  async (userId, { rejectWithValue, getState, dispatch }) => {
    try {
      // التحقق من وجود معرف المستخدم
      if (!userId) {
        throw new Error("User ID is required");
      }

      // التحقق من مخزن المستخدمين المؤقت أولاً
      const { chat } = getState();
      if (chat.userCache && chat.userCache[userId]) {
        return chat.userCache[userId];
      }

      const response = await api.get(`/users/${userId}`);

      // معالجة مختلف تنسيقات البيانات المحتملة
      let userData = null;

      if (response.data) {
        // الحالة 1: {data: {user: {...}}}
        if (response.data.data && response.data.data.user) {
          userData = response.data.data.user;
        }
        // الحالة 2: {user: {...}}
        else if (response.data.user) {
          userData = response.data.user;
        }
        // الحالة 3: الكائن مباشرة
        else if (response.data._id) {
          userData = response.data;
        }
      }

      if (!userData || !userData._id) {
        throw new Error("Invalid user data received");
      }

      // تخزين بيانات المستخدم في المخزن المؤقت
      dispatch(cacheUserData(userData));

      return userData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user data"
      );
    }
  }
);

// إضافة وظيفة لتحديث بيانات المحادثة (الاسم والصورة)
export const updateConversationDetails = createAsyncThunk(
  "chat/updateConversationDetails",
  async ({ conversationId, name, picture }, { rejectWithValue }) => {
    try {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }

      // إرسال طلب التحديث للخادم
      const response = await api.patch(`/conversations/${conversationId}`, {
        name,
        picture,
      });

      // التعامل مع مختلف تنسيقات الاستجابة
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

// إضافة خاصية لتحديث عرض المحادثات بعد إنشائها
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

      // تحديث تفاصيل المحادثة المحددة
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
      if (action.payload.conversationId === state.activeConversation?._id) {
        state.messages = [...state.messages, action.payload];
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
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.conversations = action.payload;
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

        // حفظ المحادثة الجديدة مع التأكد من وجود البيانات الكاملة
        const newConversation = action.payload;

        // تأكد من أن المحادثة ليست موجودة بالفعل
        const existingIndex = state.conversations.findIndex(
          (c) => c._id === newConversation._id
        );

        if (existingIndex !== -1) {
          // إذا كانت المحادثة موجودة، قم بتحديثها
          state.conversations[existingIndex] = {
            ...state.conversations[existingIndex],
            ...newConversation,
          };
        } else {
          // إضافة المحادثة الجديدة
          state.conversations = Array.isArray(state.conversations)
            ? [...state.conversations, newConversation]
            : [newConversation];
        }

        // تعيين المحادثة النشطة
        state.activeConversation = {
          id: newConversation._id,
          name: newConversation.name,
          picture: newConversation.picture,
          isGroup: newConversation.isGroup || false,
          otherUser: newConversation.otherUser,
        };

        // تخزين بيانات المستخدم الآخر في المخزن المؤقت
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
      })
      .addCase(createGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";

        // حفظ المحادثة الجماعية الجديدة
        const newGroupConversation = action.payload;

        // تأكد من أن المحادثة ليست موجودة بالفعل
        const existingIndex = state.conversations.findIndex(
          (c) => c._id === newGroupConversation._id
        );

        if (existingIndex !== -1) {
          // إذا كانت المحادثة موجودة، قم بتحديثها
          state.conversations[existingIndex] = {
            ...state.conversations[existingIndex],
            ...newGroupConversation,
          };
        } else {
          // إضافة المحادثة الجديدة
          state.conversations = Array.isArray(state.conversations)
            ? [...state.conversations, newGroupConversation]
            : [newGroupConversation];
        }

        // تعيين المحادثة النشطة
        state.activeConversation = {
          id: newGroupConversation._id,
          name: newGroupConversation.name,
          picture: newGroupConversation.picture || "default.jpg",
          lastSeen: "Group chat",
          isGroup: true,
          participants: newGroupConversation.participants,
        };

        state.error = null;
      })
      .addCase(createGroupConversation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.searchResults = action.payload;

        // تخزين بيانات المستخدمين من نتائج البحث في المخزن المؤقت
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

        // تخزين بيانات جميع المستخدمين في المخزن المؤقت
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
          // تحديث المحادثة في قائمة المحادثات
          const index = state.conversations.findIndex(
            (conv) => conv._id === updatedConversation._id
          );

          if (index !== -1) {
            state.conversations[index] = {
              ...state.conversations[index],
              ...updatedConversation,
            };
          }

          // تحديث المحادثة النشطة إذا كانت هي نفسها
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
          // تحديث المحادثة في القائمة
          const index = state.conversations.findIndex(
            (c) => c._id === action.payload._id
          );

          if (index !== -1) {
            state.conversations[index] = {
              ...state.conversations[index],
              ...action.payload,
            };
          }

          // تحديث المحادثة النشطة إذا كانت هي نفسها
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
} = chatSlice.actions;

export default chatSlice.reducer;
