// "use client";
// import { UserPlus, SquarePen, Search, X } from "lucide-react";
// import { useState, useMemo, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   fetchConversations,
//   createConversation,
//   createGroupConversation,
//   searchUsers,
//   getAllUsers,
//   checkAuthStatus,
//   cacheUserData,
//   updateConversationDetails,
// } from "../features/Slice/ChatSlice/chatSlice";
// import { useChat } from "../context/chat-context";
// import { motion } from "framer-motion";
// import { dateHandler } from "../utils/Date";
// import Avatar from "../assets/defaultAvatar.png";

// // إضافة وظيفة للتحقق من صلاحية روابط الصور
// const isValidImageUrl = (url) => {
//   if (!url) return false;
//   if (url === "default.jpg" || url === "conversation picture") return false;
//   if (typeof url !== "string") return false;

//   // تحقق من أن الرابط يبدو وكأنه مسار صورة صحيح أو URL
//   return (
//     url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) != null ||
//     url.startsWith("http") ||
//     url.startsWith("/")
//   );
// };

// const ChatList = () => {
//   const dispatch = useDispatch();
//   const { activeConversation: activeChat, setActiveConversation } = useChat();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [showUserSearch, setShowUserSearch] = useState(false);
//   const [showGroupCreation, setShowGroupCreation] = useState(false);
//   const [selectedUsers, setSelectedUsers] = useState([]);
//   const [groupName, setGroupName] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [authChecking, setAuthChecking] = useState(true);

//   const {
//     conversations = [],
//     users = [],
//     searchResults = [],
//     status,
//     error: storeError,
//     retryAfter,
//   } = useSelector((state) => state.chat);

//   const auth = useSelector((state) => state.login);
//   const currentUser = auth?.user;

//   // Check authentication status first
//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         setAuthChecking(true);
//         await dispatch(checkAuthStatus()).unwrap();
//         console.log("Auth status checked on page load");
//       } catch (error) {
//         console.error("Error checking auth status:", error);
//       } finally {
//         // Set authChecking to false regardless of the result
//         setAuthChecking(false);
//       }
//     };

//     checkAuth();
//   }, [dispatch]);

//   // Only fetch conversations after auth check completes
//   useEffect(() => {
//     if (authChecking) {
//       // Still checking auth, don't fetch yet
//       return;
//     }

//     if (!auth?.isAuthenticated || !currentUser?._id) {
//       console.log("User not authenticated, skipping conversation fetch");
//       setError("Please login to view conversations");
//       return;
//     }

//     console.log("Fetching conversations for user:", currentUser._id);
//     dispatch(fetchConversations())
//       .then((response) => {
//         console.log("Conversations response:", response);

//         // Check if we got valid conversations
//         if (!response.payload || response.payload.length === 0) {
//           console.log("No conversations found for this user");
//         }
//       })
//       .catch((error) => {
//         console.error("Error fetching conversations:", error);
//         setError("Failed to load conversations");
//       });
//   }, [dispatch, currentUser, auth?.isAuthenticated, authChecking]);

//   // Fetch all users for group creation
//   useEffect(() => {
//     const fetchUsers = async () => {
//       if (authChecking) {
//         // Still checking auth, don't fetch yet
//         return;
//       }

//       if (!auth?.isAuthenticated || !currentUser?._id) {
//         console.log("User not authenticated, skipping users fetch");
//         setError("Please login to create a group");
//         setShowGroupCreation(false);
//         return;
//       }

//       if (showGroupCreation) {
//         try {
//           setLoading(true);
//           setError(null);
//           console.log("Fetching users for group creation...");
//           const result = await dispatch(getAllUsers()).unwrap();
//           console.log("Processed users data:", result);

//           if (!Array.isArray(result)) {
//             throw new Error("Invalid users data received");
//           }
//         } catch (error) {
//           console.error("Error fetching users:", error);
//           setError(error?.message || "Failed to load users");
//           setShowGroupCreation(false);
//         } finally {
//           setLoading(false);
//         }
//       }
//     };

//     fetchUsers();
//   }, [
//     dispatch,
//     showGroupCreation,
//     currentUser,
//     auth?.isAuthenticated,
//     authChecking,
//   ]);

//   // Search users effect
//   useEffect(() => {
//     let timeoutId = null;

//     const searchUsersDebounced = async () => {
//       if (authChecking) {
//         // Still checking auth, don't search yet
//         return;
//       }

//       if (!auth?.isAuthenticated || !currentUser?._id) {
//         console.log("User not authenticated, skipping user search");
//         setError("Please login to search users");
//         return;
//       }

//       if (searchTerm.trim() && showUserSearch) {
//         try {
//           setLoading(true);
//           setError(null);
//           console.log("Searching users with term:", searchTerm);
//           const resultAction = await dispatch(searchUsers(searchTerm));

//           if (searchUsers.fulfilled.match(resultAction)) {
//             console.log("Search results:", resultAction.payload);
//             // If no results found with current search term
//             if (
//               resultAction.payload.length === 0 &&
//               searchTerm.trim().length > 0
//             ) {
//               setError(`No users found matching "${searchTerm}"`);
//             }
//           } else if (searchUsers.rejected.match(resultAction)) {
//             throw new Error(resultAction.payload || "Failed to search users");
//           }

//           setLoading(false);
//         } catch (error) {
//           console.error("Error searching users:", error);
//           setError(error?.message || "Failed to search users");
//           setLoading(false);
//         }
//       } else {
//         // Clear search results when search term is empty
//         if (searchTerm.trim().length === 0) {
//           dispatch({
//             type: "chat/searchUsers/fulfilled",
//             payload: [],
//           });
//         }
//       }
//     };

//     // Clear any existing timeout
//     if (timeoutId) {
//       clearTimeout(timeoutId);
//     }

//     // Use a shorter timeout for a more responsive feel
//     timeoutId = setTimeout(searchUsersDebounced, 250);

//     return () => {
//       if (timeoutId) {
//         clearTimeout(timeoutId);
//       }
//     };
//   }, [
//     searchTerm,
//     showUserSearch,
//     dispatch,
//     currentUser,
//     auth?.isAuthenticated,
//     authChecking,
//   ]);

//   const handleUserClick = async (user) => {
//     if (!user?._id) {
//       console.error("Invalid user data:", user);
//       setError("Invalid user data");
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);
//       console.log("Creating conversation with user:", user);

//       // حفظ بيانات المستخدم في cache قبل إنشاء المحادثة
//       if (user._id) {
//         console.log("Caching user data:", user);
//         dispatch(cacheUserData(user));
//       }

//       // إنشاء المحادثة مع المستخدم - سيتم إرسال الاسم والصورة تلقائيًا
//       const response = await dispatch(createConversation(user._id)).unwrap();
//       console.log("Conversation created:", response);

//       if (!response?._id) {
//         throw new Error("Invalid conversation data received");
//       }

//       // تحضير بيانات المستخدم للعرض
//       const displayName =
//         user.fullName ||
//         `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
//         user.username ||
//         user.email ||
//         "Chat";

//       const displayPicture =
//         user.avatar && user.avatar !== "default.jpg" ? user.avatar : Avatar;

//       // تحديد المحادثة النشطة
//       console.log("Setting active conversation with:", {
//         id: response._id,
//         name: displayName,
//         picture: displayPicture,
//         otherUser: user,
//       });

//       setActiveConversation({
//         id: response._id,
//         name: displayName,
//         picture: displayPicture,
//         lastSeen: "Recently active",
//         isGroup: false,
//         otherUser: user,
//       });

//       setShowUserSearch(false);
//       setSearchTerm("");
//     } catch (error) {
//       console.error("Error creating conversation:", error);
//       setError(error?.message || "Failed to create conversation");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGroupIconClick = async () => {
//     // Check if still validating auth
//     if (authChecking) {
//       console.log("Authentication check in progress, please wait...");
//       return;
//     }

//     // First check if user is authenticated
//     if (!auth?.isAuthenticated || !currentUser?._id) {
//       setError("Please login to create a group");
//       return;
//     }

//     // Check if we need to wait before retrying
//     if (retryAfter && Date.now() < retryAfter) {
//       setError("Please wait a moment before trying again.");
//       return;
//     }

//     setShowGroupCreation(true);
//     setError(null);
//     try {
//       console.log("Fetching users for group creation...");
//       await dispatch(getAllUsers()).unwrap();
//     } catch (error) {
//       console.error("Error fetching users:", error);
//       if (error.message?.includes("Too many requests")) {
//         setError(
//           "Too many requests. Please wait a moment before trying again."
//         );
//       } else {
//         setError(error.message || "Failed to load users. Please try again.");
//       }
//       // Close the modal if there's an error
//       setTimeout(() => {
//         setShowGroupCreation(false);
//         setError(null);
//       }, 3000);
//     }
//   };

//   const handleCreateGroup = async () => {
//     if (selectedUsers.length < 2) {
//       setError("Please select at least 2 users for the group");
//       return;
//     }
//     if (!groupName.trim()) {
//       setError("Please enter a group name");
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);
//       console.log("Creating group with:", {
//         name: groupName.trim(),
//         participants: selectedUsers.map((user) => user._id),
//       });
//       const response = await dispatch(
//         createGroupConversation({
//           name: groupName.trim(),
//           participants: selectedUsers.map((user) => user._id),
//         })
//       ).unwrap();
//       console.log("Group created:", response);
//       setActiveConversation({
//         id: response._id,
//         name: response.name,
//         picture: response.avatar,
//         lastSeen: "Group chat",
//       });
//       setShowGroupCreation(false);
//       setSelectedUsers([]);
//       setGroupName("");
//       setError(null);
//     } catch (error) {
//       console.error("Error creating group:", error);
//       setError(error?.message || "Failed to create group");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleUserSelect = (user) => {
//     setSelectedUsers((prev) => {
//       const isSelected = prev.some((u) => u._id === user._id);
//       if (isSelected) {
//         return prev.filter((u) => u._id !== user._id);
//       }
//       return [
//         ...prev,
//         {
//           _id: user._id,
//           name: `${user.firstName} ${user.lastName}`,
//           avatar: user.avatar,
//           email: user.email,
//         },
//       ];
//     });
//   };

//   const handleClearSearch = () => {
//     setSearchTerm("");
//     if (showUserSearch) {
//       setShowUserSearch(false);
//     }
//   };

//   const filteredChats = useMemo(() => {
//     if (!Array.isArray(conversations)) return [];
//     if (!searchTerm || showUserSearch) return conversations;

//     const searchLower = searchTerm.toLowerCase();
//     return conversations.filter((chat) => {
//       if (!chat) return false;
//       const nameMatch = chat.name?.toLowerCase()?.includes(searchLower);
//       const messageMatch =
//         chat.lastMessage?.message?.toLowerCase()?.includes(searchLower) ||
//         chat.lastMessage?.content?.toLowerCase()?.includes(searchLower);
//       return nameMatch || messageMatch;
//     });
//   }, [searchTerm, conversations, showUserSearch]);

//   const highlightSearchTerm = (text, searchTerm) => {
//     if (!searchTerm) return text;
//     const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
//     return (
//       <span>
//         {parts.map((part, index) =>
//           part.toLowerCase() === searchTerm.toLowerCase() ? (
//             <span key={index} className="font-semibold text-gray-900">
//               {part}
//             </span>
//           ) : (
//             part
//           )
//         )}
//       </span>
//     );
//   };

//   return (
//     <div className="flex flex-col w-[380px] h-screen bg-white border-r border-gray-300">
//       {/* Header */}
//       <div className="flex items-center justify-between w-full p-4">
//         <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
//         <div className="flex space-x-2">
//           <button
//             onClick={() => setShowUserSearch(true)}
//             className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-colors duration-200"
//             title="Add New Chat"
//           >
//             <UserPlus className="w-5 h-5 text-[#57356A]" />
//           </button>

//           <button
//             onClick={handleGroupIconClick}
//             className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-colors duration-200"
//             title="Create New Group"
//           >
//             <SquarePen className="w-5 h-5 text-[#57356A]" />
//           </button>
//         </div>
//       </div>

//       {/* Search */}
//       <div className="px-4 pb-4">
//         <div className="relative">
//           <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
//           <input
//             id="searchInput"
//             type="text"
//             placeholder={showUserSearch ? "Search users..." : "Search chats..."}
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 transition-all duration-300"
//           />
//           {searchTerm && (
//             <button
//               onClick={handleClearSearch}
//               className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
//             >
//               <X className="h-4 w-4" />
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="flex-1 overflow-y-auto">
//         {authChecking ? (
//           // Show loading when checking authentication
//           <div className="flex flex-col items-center justify-center h-[400px]">
//             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4D2D61]"></div>
//             <p className="mt-4 text-gray-500">Checking authentication...</p>
//           </div>
//         ) : !auth?.isAuthenticated ? (
//           // Not authenticated message
//           <div className="flex flex-col items-center justify-center h-[400px] text-center">
//             <p className="text-gray-500">Please login to view conversations</p>
//           </div>
//         ) : showUserSearch ? (
//           <motion.div
//             initial={{ opacity: 0, y: -10 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.2 }}
//           >
//             {loading ? (
//               <div className="p-4 space-y-4">
//                 {[...Array(3)].map((_, index) => (
//                   <div
//                     key={index}
//                     className="animate-pulse flex items-center space-x-4"
//                   >
//                     <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
//                     <div className="flex-1">
//                       <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
//                       <div className="w-1/2 h-3 bg-gray-200 rounded mt-2"></div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : searchTerm && searchResults && searchResults.length === 0 ? (
//               <div className="flex flex-col items-center justify-center h-[400px] text-center">
//                 <p className="text-gray-500">
//                   No users found matching "{searchTerm}"
//                 </p>
//               </div>
//             ) : searchTerm && Array.isArray(searchResults) ? (
//               <div className="space-y-2 mt-2">
//                 {searchResults.length === 0 ? (
//                   <div className="flex flex-col items-center justify-center py-10 text-center">
//                     <p className="text-gray-500">
//                       No users found matching "{searchTerm}"
//                     </p>
//                   </div>
//                 ) : (
//                   searchResults
//                     .filter((user) => user._id !== currentUser?._id)
//                     .map((user) => (
//                       <div
//                         key={user._id}
//                         className="flex items-center p-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 ease-in-out border-b border-gray-100"
//                         onClick={() => handleUserClick(user)}
//                       >
//                         <img
//                           src={
//                             isValidImageUrl(user?.avatar) ? user.avatar : Avatar
//                           }
//                           alt={`${user.firstName} ${user.lastName}`}
//                           className="w-10 h-10 rounded-full object-cover border border-gray-200"
//                           onError={(e) => {
//                             console.log(
//                               `Image error for ${user.firstName}:`,
//                               e
//                             );
//                             e.target.onerror = null;
//                             e.target.src = Avatar;
//                           }}
//                         />
//                         <div className="ml-3 flex-1">
//                           <h3 className="font-medium text-gray-900">
//                             {highlightSearchTerm(
//                               `${user.firstName} ${user.lastName}`,
//                               searchTerm
//                             )}
//                           </h3>
//                           <p className="text-sm text-gray-500">
//                             {highlightSearchTerm(
//                               user.username || user.email,
//                               searchTerm
//                             )}
//                           </p>
//                         </div>
//                       </div>
//                     ))
//                 )}
//               </div>
//             ) : (
//               <div className="text-center text-gray-500 mt-10">
//                 Type to search users
//               </div>
//             )}
//           </motion.div>
//         ) : (
//           <>
//             {status === "loading" ? (
//               <div className="p-4 space-y-4">
//                 {[...Array(5)].map((_, index) => (
//                   <div
//                     key={index}
//                     className="animate-pulse flex items-center space-x-4"
//                   >
//                     <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
//                     <div className="flex-1">
//                       <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
//                       <div className="w-1/2 h-3 bg-gray-200 rounded mt-2"></div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : error ? (
//               <div className="text-center text-red-500 mt-10">{error}</div>
//             ) : Array.isArray(filteredChats) && filteredChats.length > 0 ? (
//               <motion.div
//                 initial={{ opacity: 0, y: -10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.2 }}
//               >
//                 {filteredChats.map((chat) => {
//                   console.log("Processing chat in UI:", chat);

//                   // استخراج الاسم مباشرة من كائن المحادثة
//                   let displayName = chat.name;
//                   let displayPicture = chat.picture;

//                   // استخراج بيانات المستخدم الآخر من المحادثة
//                   const otherUser =
//                     chat.otherUser ||
//                     (chat.participants && Array.isArray(chat.participants)
//                       ? chat.participants.find(
//                           (p) => p._id !== currentUser?._id
//                         )
//                       : null);

//                   // استخراج بيانات المستخدم من المخزن المؤقت إذا كان متاحًا
//                   let userData = null;
//                   if (
//                     otherUser &&
//                     otherUser._id &&
//                     chat?.userCache?.[otherUser._id]
//                   ) {
//                     userData = chat.userCache[otherUser._id];
//                   } else if (otherUser && otherUser._id && chat?.userCache) {
//                     userData = chat.userCache[otherUser._id] || null;
//                   }

//                   // إذا كان اسم المحادثة هو القيمة الافتراضية، استخدم اسم المستخدم بدلاً منه
//                   if (
//                     !displayName ||
//                     displayName === "Chat" ||
//                     displayName === "conversation name"
//                   ) {
//                     if (otherUser) {
//                       displayName =
//                         otherUser.fullName ||
//                         `${otherUser.firstName || ""} ${
//                           otherUser.lastName || ""
//                         }`.trim() ||
//                         otherUser.username ||
//                         otherUser.email ||
//                         chat.name ||
//                         "Chat";
//                     } else if (!chat.isGroup) {
//                       displayName = "Chat";
//                     } else {
//                       displayName = "Group Chat";
//                     }
//                   }

//                   // إذا كانت صورة المحادثة هي القيمة الافتراضية، استخدم صورة المستخدم بدلاً منها
//                   if (
//                     !displayPicture ||
//                     displayPicture === "default.jpg" ||
//                     displayPicture === "conversation picture" ||
//                     displayPicture === "/src/assets/defaultAvatar.png"
//                   ) {
//                     if (otherUser && isValidImageUrl(otherUser.avatar)) {
//                       displayPicture = otherUser.avatar;
//                     } else {
//                       // استخدم الصورة الافتراضية مباشرة بدلاً من تخزين مسار غير صالح
//                       displayPicture = Avatar;
//                     }
//                   }

//                   // سجل معلومات تصحيح للعثور على المشكلة
//                   console.log(
//                     `Chat ${
//                       chat._id || chat.id
//                     }: Using Name: ${displayName}, Picture: ${displayPicture}, User:`,
//                     otherUser
//                   );

//                   return (
//                     <div
//                       className={`relative flex items-center p-3 cursor-pointer hover:bg-gray-100 transition duration-200 ease-in-out ${
//                         activeChat?.id === chat?._id ? "bg-[#4D2D61]/10" : ""
//                       }`}
//                       key={chat?._id || chat?.id}
//                       onClick={() => {
//                         setActiveConversation({
//                           id: chat?._id || chat?.id,
//                           name: displayName,
//                           picture: isValidImageUrl(displayPicture)
//                             ? displayPicture
//                             : Avatar,
//                           lastSeen: chat?.lastSeen || "Recently active",
//                           isGroup: chat.isGroup,
//                           participants: chat.participants,
//                           otherUser: otherUser,
//                         });
//                       }}
//                     >
//                       <div className="relative flex-shrink-0 mr-3">
//                         {isValidImageUrl(displayPicture) ? (
//                           <div className="w-10 h-10 rounded-full overflow-hidden">
//                             <img
//                               src={displayPicture}
//                               alt={displayName || "User"}
//                               loading="lazy"
//                               className="w-10 h-10 rounded-full object-cover"
//                               onError={(e) => {
//                                 console.log(
//                                   `Image error for ${displayName}:`,
//                                   e
//                                 );
//                                 e.target.onerror = null;
//                                 e.target.src = Avatar;
//                               }}
//                             />
//                           </div>
//                         ) : (
//                           <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
//                             {displayName?.[0]?.toUpperCase() || "?"}
//                           </div>
//                         )}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex justify-between items-center">
//                           <h3 className="text-sm font-semibold truncate text-[#4D2D61]">
//                             {displayName}
//                           </h3>
//                           <span className="text-xs text-gray-500">
//                             {dateHandler(chat?.lastMessage?.createdAt)}
//                           </span>
//                         </div>
//                         <p className="text-xs text-gray-500 truncate">
//                           {chat?.lastMessage?.message ||
//                             chat?.lastMessage?.content ||
//                             "No messages yet"}
//                         </p>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </motion.div>
//             ) : !Array.isArray(conversations) ? (
//               <div className="flex flex-col items-center justify-center h-[400px] text-center">
//                 <p className="text-gray-500">Error loading conversations</p>
//                 <p className="text-sm text-gray-400 mt-2">
//                   Please refresh the page
//                 </p>
//               </div>
//             ) : conversations.length === 0 ? (
//               <div className="flex flex-col items-center justify-center h-[400px] text-center">
//                 <p className="text-gray-500">No conversations yet</p>
//                 <p className="text-sm text-gray-400 mt-2">
//                   Click the{" "}
//                   <UserPlus className="inline w-4 h-4 text-[#57356A]" /> icon to
//                   start a new chat
//                 </p>
//               </div>
//             ) : (
//               <div className="text-center text-gray-500 mt-10">
//                 {searchTerm
//                   ? `No conversations found matching "${searchTerm}"`
//                   : "Your conversation list is empty"}
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {showGroupCreation && (
//         <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
//             <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
//             <input
//               type="text"
//               placeholder="Group Name"
//               value={groupName}
//               onChange={(e) => setGroupName(e.target.value)}
//               className="w-full p-2 border rounded mb-4 focus:outline-none focus:ring-1 focus:ring-[#4D2D61]"
//             />
//             <div className="mb-4">
//               <h4 className="text-sm font-medium mb-2">Select Participants</h4>
//               <div className="max-h-60 overflow-y-auto border rounded">
//                 {status === "loading" ? (
//                   <div className="p-4 text-center">
//                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4D2D61] mx-auto"></div>
//                     <p className="mt-2 text-sm text-gray-500">
//                       Loading users...
//                     </p>
//                   </div>
//                 ) : error || storeError ? (
//                   <div className="p-4 text-center text-red-500">
//                     {error || storeError}
//                   </div>
//                 ) : Array.isArray(users) && users.length > 0 ? (
//                   users
//                     .filter((user) => {
//                       // Make sure we have a valid user object with required fields
//                       if (!user || !user._id || !user.firstName) {
//                         console.log("Invalid user object:", user);
//                         return false;
//                       }
//                       return user._id !== currentUser?._id;
//                     })
//                     .map((user) => (
//                       <div
//                         key={user._id}
//                         className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
//                         onClick={() => handleUserSelect(user)}
//                       >
//                         <input
//                           type="checkbox"
//                           checked={selectedUsers.some(
//                             (u) => u._id === user._id
//                           )}
//                           onChange={() => {}}
//                           className="mr-2"
//                         />
//                         <img
//                           src={
//                             isValidImageUrl(user?.avatar) ? user.avatar : Avatar
//                           }
//                           alt={`${user.firstName} ${user.lastName}`}
//                           className="w-8 h-8 rounded-full mr-2"
//                           onError={(e) => {
//                             console.log(
//                               `Image error for ${user.firstName}:`,
//                               e
//                             );
//                             e.target.onerror = null;
//                             e.target.src = Avatar;
//                           }}
//                         />
//                         <div className="flex flex-col">
//                           <span className="font-medium">
//                             {user.firstName} {user.lastName}
//                           </span>
//                           <span className="text-xs text-gray-500">
//                             {user.username || user.email}
//                           </span>
//                         </div>
//                       </div>
//                     ))
//                 ) : (
//                   <div className="p-4 text-center text-gray-500">
//                     No users available
//                   </div>
//                 )}
//               </div>
//             </div>
//             <div className="flex justify-between items-center mb-4">
//               <span className="text-sm text-gray-500">
//                 {selectedUsers.length} users selected
//               </span>
//               <button
//                 onClick={() => setSelectedUsers([])}
//                 className="text-sm text-[#4D2D61] hover:text-[#57356A]"
//               >
//                 Clear Selection
//               </button>
//             </div>
//             <div className="flex justify-end space-x-2">
//               <button
//                 onClick={() => {
//                   setShowGroupCreation(false);
//                   setSelectedUsers([]);
//                   setGroupName("");
//                   setError(null);
//                 }}
//                 className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleCreateGroup}
//                 disabled={
//                   status === "loading" ||
//                   selectedUsers.length < 2 ||
//                   !groupName.trim()
//                 }
//                 className="px-4 py-2 bg-[#4D2D61] text-white rounded hover:bg-[#57356A] disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Create Group
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChatList;

//2

"use client";
import { UserPlus, SquarePen, Search, X, Check, Plus } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchConversations,
  createConversation,
  createGroupConversation,
  searchUsers,
  getAllUsers,
  checkAuthStatus,
  cacheUserData,
  updateConversationDetails,
} from "../features/Slice/ChatSlice/chatSlice";
import { useChat } from "../context/chat-context";
import { motion } from "framer-motion";
import { dateHandler } from "../utils/Date";
import Avatar from "../assets/defaultAvatar.png";
import { Loader } from "lucide-react";

// إضافة وظيفة للتحقق من صلاحية روابط الصور
const isValidImageUrl = (url) => {
  if (!url) return false;
  if (url === "default.jpg" || url === "conversation picture") return false;
  if (typeof url !== "string") return false;

  // تحقق من أن الرابط يبدو وكأنه مسار صورة صحيح أو URL
  return (
    url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) != null ||
    url.startsWith("http") ||
    url.startsWith("/")
  );
};

const ChatList = () => {
  const dispatch = useDispatch();
  const { activeConversation: activeChat, setActiveConversation } = useChat();
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [groupCreationLoading, setGroupCreationLoading] = useState(false);

  const {
    conversations = [],
    users = [],
    searchResults = [],
    status,
    error: storeError,
    retryAfter,
  } = useSelector((state) => state.chat);

  const auth = useSelector((state) => state.login);
  const currentUser = auth?.user;

  // بديل لـ useEffect الذي يتحقق من حالة المصادقة
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthChecking(true);
        await dispatch(checkAuthStatus()).unwrap();
      } catch (error) {
        // تجاهل الأخطاء وعدم تسجيلها
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  // بديل لـ useEffect الذي يجلب المحادثات
  useEffect(() => {
    if (authChecking) {
      return;
    }

    if (!auth?.isAuthenticated || !currentUser?._id) {
      setError("Please login to view conversations");
      return;
    }

    dispatch(fetchConversations())
      .then((response) => {
        // تجاهل رسائل التصحيح
      })
      .catch(() => {
        setError("Failed to load conversations");
      });
  }, [dispatch, currentUser, auth?.isAuthenticated, authChecking]);

  // بديل لـ useEffect الذي يبحث عن المستخدمين
  useEffect(() => {
    let timeoutId = null;

    const searchUsersDebounced = async () => {
      if (authChecking) {
        return;
      }

      if (!auth?.isAuthenticated || !currentUser?._id) {
        setError("Please login to search users");
        return;
      }

      if (searchTerm.trim() && showUserSearch) {
        try {
          setLoading(true);
          setError(null);
          const resultAction = await dispatch(searchUsers(searchTerm));

          if (searchUsers.fulfilled.match(resultAction)) {
            if (
              resultAction.payload.length === 0 &&
              searchTerm.trim().length > 0
            ) {
              setError(`No users found matching "${searchTerm}"`);
            }
          } else if (searchUsers.rejected.match(resultAction)) {
            throw new Error(resultAction.payload || "Failed to search users");
          }

          setLoading(false);
        } catch (error) {
          setError(error?.message || "Failed to search users");
          setLoading(false);
        }
      } else {
        if (searchTerm.trim().length === 0) {
          dispatch({
            type: "chat/searchUsers/fulfilled",
            payload: [],
          });
        }
      }
    };

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(searchUsersDebounced, 250);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    searchTerm,
    showUserSearch,
    dispatch,
    currentUser,
    auth?.isAuthenticated,
    authChecking,
  ]);

  const handleUserClick = async (user) => {
    if (!user?._id) {
      setError("Invalid user data");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (user._id) {
        dispatch(cacheUserData(user));
      }

      const response = await dispatch(createConversation(user._id)).unwrap();

      if (!response?._id) {
        throw new Error("Invalid conversation data received");
      }

      const displayName =
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        user.email ||
        "Chat";

      const displayPicture =
        user.avatar && user.avatar !== "default.jpg" ? user.avatar : Avatar;

      setActiveConversation({
        id: response._id,
        name: displayName,
        picture: displayPicture,
        lastSeen: "Recently active",
        isGroup: false,
        otherUser: user,
      });

      setShowUserSearch(false);
      setSearchTerm("");
    } catch (error) {
      setError(error?.message || "Failed to create conversation");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupIconClick = async () => {
    if (authChecking) {
      return;
    }

    if (!auth?.isAuthenticated || !currentUser?._id) {
      setError("Please login to create a group");
      return;
    }

    if (retryAfter && Date.now() < retryAfter) {
      setError("Please wait a moment before trying again.");
      return;
    }

    setShowGroupCreation(true);
    setError(null);
    try {
      await dispatch(getAllUsers()).unwrap();
    } catch (error) {
      if (error.message?.includes("Too many requests")) {
        setError(
          "Too many requests. Please wait a moment before trying again."
        );
      } else {
        setError(error.message || "Failed to load users. Please try again.");
      }
      setTimeout(() => {
        setShowGroupCreation(false);
        setError(null);
      }, 3000);
    }
  };

  const handleCreateGroup = async () => {
    try {
      // Validate inputs
      if (!groupName?.trim()) {
        setError("Please enter a group name");
        return;
      }

      if (!selectedUsers || selectedUsers.length < 1) {
        setError("Please select at least one user");
        return;
      }

      // Check if currentUser exists
      if (!currentUser || !currentUser._id) {
        setError("You must be logged in to create a group");
        return;
      }

      setGroupCreationLoading(true);
      setError(null);

      // Extract just the user IDs from the selected users
      const participantIds = selectedUsers.map((user) => user._id || user.id);

      // Dispatch the action with all required data
      const result = await dispatch(
        createGroupConversation({
          groupName: groupName,
          participants: participantIds,
          currentUserId: currentUser._id,
          groupPicture: null,
        })
      );

      // Check if the action was successful or rejected
      if (result.error) {
        throw new Error(result.error.message || "Failed to create group");
      }

      // Reset state and close modal on success
      setGroupName("");
      setSelectedUsers([]);
      setShowGroupCreation(false);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.message || "Failed to create group");
    } finally {
      setGroupCreationLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      }

      // Ensure we have a valid user object with the name properly formatted
      const displayName =
        user.name ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        user.email ||
        "User";

      return [
        ...prev,
        {
          _id: user._id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          name: displayName,
          avatar: user.avatar || null,
          email: user.email || "",
        },
      ];
    });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (showUserSearch) {
      setShowUserSearch(false);
    }
  };

  // Add missing handleSearchChange function
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Add missing handleRemoveUser function
  const handleRemoveUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((user) => user._id !== userId));
  };

  const filteredChats = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    if (!searchTerm || showUserSearch) return conversations;

    const searchLower = searchTerm.toLowerCase();
    return conversations.filter((chat) => {
      if (!chat) return false;
      const nameMatch = chat.name?.toLowerCase()?.includes(searchLower);
      const messageMatch =
        chat.lastMessage?.message?.toLowerCase()?.includes(searchLower) ||
        chat.lastMessage?.content?.toLowerCase()?.includes(searchLower);
      return nameMatch || messageMatch;
    });
  }, [searchTerm, conversations, showUserSearch]);

  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={index} className="font-semibold text-gray-900">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col w-[380px] h-screen bg-white border-r border-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between w-full p-4">
        <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUserSearch(true)}
            className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-colors duration-200"
            title="Add New Chat"
          >
            <UserPlus className="w-5 h-5 text-[#57356A]" />
          </button>

          <button
            onClick={handleGroupIconClick}
            className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-colors duration-200"
            title="Create New Group"
          >
            <SquarePen className="w-5 h-5 text-[#57356A]" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="searchInput"
            type="text"
            placeholder={showUserSearch ? "Search users..." : "Search chats..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 transition-all duration-300"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {authChecking ? (
          // Show loading when checking authentication
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4D2D61]"></div>
            <p className="mt-4 text-gray-500">Checking authentication...</p>
          </div>
        ) : !auth?.isAuthenticated ? (
          // Not authenticated message
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <p className="text-gray-500">Please login to view conversations</p>
          </div>
        ) : showUserSearch ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse flex items-center space-x-4"
                  >
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
                      <div className="w-1/2 h-3 bg-gray-200 rounded mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm && searchResults && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <p className="text-gray-500">
                  No users found matching "{searchTerm}"
                </p>
              </div>
            ) : searchTerm && Array.isArray(searchResults) ? (
              <div className="space-y-2 mt-2">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-gray-500">
                      No users found matching "{searchTerm}"
                    </p>
                  </div>
                ) : (
                  searchResults
                    .filter((user) => user._id !== currentUser?._id)
                    .map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center p-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 ease-in-out border-b border-gray-100"
                        onClick={() => handleUserClick(user)}
                      >
                        <img
                          src={
                            isValidImageUrl(user?.avatar) ? user.avatar : Avatar
                          }
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = Avatar;
                          }}
                        />
                        <div className="ml-3 flex-1">
                          <h3 className="font-medium text-gray-900">
                            {highlightSearchTerm(
                              `${user.firstName} ${user.lastName}`,
                              searchTerm
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {highlightSearchTerm(
                              user.username || user.email,
                              searchTerm
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10">
                Type to search users
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {status === "loading" ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse flex items-center space-x-4"
                  >
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
                      <div className="w-1/2 h-3 bg-gray-200 rounded mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center text-red-500 mt-10">{error}</div>
            ) : Array.isArray(filteredChats) && filteredChats.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filteredChats.map((chat) => {
                  let displayName = chat.name;
                  let displayPicture = chat.picture;

                  const otherUser =
                    chat.otherUser ||
                    (chat.participants && Array.isArray(chat.participants)
                      ? chat.participants.find(
                          (p) => p._id !== currentUser?._id
                        )
                      : null);

                  let userData = null;
                  if (
                    otherUser &&
                    otherUser._id &&
                    chat?.userCache?.[otherUser._id]
                  ) {
                    userData = chat.userCache[otherUser._id];
                  } else if (otherUser && otherUser._id && chat?.userCache) {
                    userData = chat.userCache[otherUser._id] || null;
                  }

                  if (
                    !displayName ||
                    displayName === "Chat" ||
                    displayName === "conversation name"
                  ) {
                    if (otherUser) {
                      displayName =
                        otherUser.fullName ||
                        `${otherUser.firstName || ""} ${
                          otherUser.lastName || ""
                        }`.trim() ||
                        otherUser.username ||
                        otherUser.email ||
                        chat.name ||
                        "Chat";
                    } else if (!chat.isGroup) {
                      displayName = "Chat";
                    } else {
                      displayName = "Group Chat";
                    }
                  }

                  if (
                    !displayPicture ||
                    displayPicture === "default.jpg" ||
                    displayPicture === "conversation picture" ||
                    displayPicture === "/src/assets/defaultAvatar.png"
                  ) {
                    if (otherUser && isValidImageUrl(otherUser.avatar)) {
                      displayPicture = otherUser.avatar;
                    } else {
                      displayPicture = Avatar;
                    }
                  }

                  return (
                    <div
                      className={`relative flex items-center p-3 cursor-pointer hover:bg-gray-100 transition duration-200 ease-in-out ${
                        activeChat?.id === chat?._id ? "bg-[#4D2D61]/10" : ""
                      }`}
                      key={chat?._id || chat?.id}
                      onClick={() => {
                        setActiveConversation({
                          id: chat?._id || chat?.id,
                          name: displayName,
                          picture: isValidImageUrl(displayPicture)
                            ? displayPicture
                            : Avatar,
                          lastSeen: chat?.lastSeen || "Recently active",
                          isGroup: chat.isGroup,
                          participants: chat.participants,
                          otherUser: otherUser,
                        });
                      }}
                    >
                      <div className="relative flex-shrink-0 mr-3">
                        {isValidImageUrl(displayPicture) ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img
                              src={displayPicture}
                              alt={displayName || "User"}
                              loading="lazy"
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = Avatar;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold bg-[#4D2D61]">
                            {displayName?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold truncate text-[#4D2D61]">
                            {displayName}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {dateHandler(chat?.lastMessage?.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {chat?.lastMessage?.message ||
                            chat?.lastMessage?.content ||
                            "No messages yet"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : !Array.isArray(conversations) ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <p className="text-gray-500">Error loading conversations</p>
                <p className="text-sm text-gray-400 mt-2">
                  Please refresh the page
                </p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <p className="text-gray-500">No conversations yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click the{" "}
                  <UserPlus className="inline w-4 h-4 text-[#57356A]" /> icon to
                  start a new chat
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10">
                {searchTerm
                  ? `No conversations found matching "${searchTerm}"`
                  : "Your conversation list is empty"}
              </div>
            )}
          </>
        )}
      </div>

      {showGroupCreation && (
        <motion.div
          className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-white rounded-lg w-[350px] shadow-xl flex flex-col overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Create New Group</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label
                  htmlFor="groupName"
                  className="block mb-2 text-sm font-medium"
                >
                  Group Name
                </label>
                <input
                  type="text"
                  id="groupName"
                  placeholder="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61]"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  Select Participants
                </label>
                <div className="border rounded-md p-2">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4D2D61] mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">
                        Loading users...
                      </p>
                    </div>
                  ) : users && users.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto">
                      {users.map((user) => {
                        const isSelected = selectedUsers.some(
                          (u) => u._id === user._id
                        );

                        const displayName =
                          user.fullName ||
                          `${user.firstName || ""} ${
                            user.lastName || ""
                          }`.trim() ||
                          user.username ||
                          user.email ||
                          "User";

                        return (
                          <div
                            key={user._id}
                            className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer ${
                              isSelected ? "bg-gray-100" : ""
                            }`}
                            onClick={() =>
                              handleUserSelect({
                                _id: user._id,
                                firstName: user.firstName || "",
                                lastName: user.lastName || "",
                                name: displayName,
                                avatar: user.avatar || null,
                                email: user.email || "",
                              })
                            }
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mr-2"
                            />
                            <div>
                              <p className="font-medium text-sm">
                                {displayName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No users available
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-between text-sm text-gray-500">
                  <span>{selectedUsers.length} users selected</span>
                  {selectedUsers.length > 0 && (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm mt-2">{error}</div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                onClick={() => setShowGroupCreation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-[#4D2D61] text-white rounded-md hover:bg-[#5c3a73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreateGroup}
                disabled={
                  groupCreationLoading || !groupName || selectedUsers.length < 1
                }
              >
                {groupCreationLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Group"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ChatList;
