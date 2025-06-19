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
  fetchMessages,
} from "../features/Slice/ChatSlice/chatSlice";
import { useChat } from "../context/chat-context";
import { motion } from "framer-motion";

import Avatar from "../assets/defaultAvatar.png";
import {
  isValidImageUrl,
  getAvatarUrl,
  getGroupImageUrl,
} from "../utils/imageUtils";
import ConversationItem from "./ConversationItem";

const ChatList = ({ onChatSelect }) => {
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
  const [groupImage, setGroupImage] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState(null);

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

  useEffect(() => {
    if (authChecking) return;

    const loadConversations = async () => {
      if (!auth?.isAuthenticated || !currentUser?._id) {
        setError("Please login to view conversations");
        return;
      }

      try {
        await dispatch(fetchConversations()).unwrap();
      } catch (error) {
        console.error("Failed to load conversations:", error);
        setError("Failed to load conversations");
      }
    };

    loadConversations();

    // No need for periodic refresh since we'll update in real-time through socket events
  }, [auth?.isAuthenticated, currentUser?._id, authChecking, dispatch]);

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
        "Unknown User";

      const displayPicture =
        user.avatar && user.avatar !== "default.jpg" ? user.avatar : Avatar;

      setActiveConversation({
        id: response._id,
        name: displayName,
        picture: displayPicture,
        lastSeen: "Recently active",
        isGroup: false,
        otherUser: user,
        admin: currentUser._id,
      });

      setShowUserSearch(false);
      setSearchTerm("");

      // استدعاء دالة إخفاء القائمة في وضع الموبايل
      if (onChatSelect) {
        onChatSelect();
      }
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async () => {
    try {
      if (!groupName || groupName.trim() === "") {
        setError("Please enter a group name");
        return;
      }

      if (!selectedUsers || selectedUsers.length < 2) {
        setError("Please select at least 2 users to create a group");
        return;
      }

      if (!currentUser) {
        setError("You must be logged in to create a group");
        return;
      }

      const participantIds = selectedUsers.map((user) => user._id);
      if (!participantIds.includes(currentUser._id)) {
        participantIds.push(currentUser._id);
      }

      let pictureBase64 = null;
      if (groupImage) {
        try {
          pictureBase64 = await convertFileToBase64(groupImage);
        } catch (error) {
          console.error("Error converting image to base64:", error);
          setError("Error processing image");
          return;
        }
      }
      const groupData = {
        groupName: groupName.trim(),
        participantIds: participantIds,
        groupPicture: pictureBase64,
      };

      setLoading(true);
      setGroupCreationLoading(true);
      setError(null);

      const resultAction = await dispatch(createGroupConversation(groupData));

      if (createGroupConversation.fulfilled.match(resultAction)) {
        console.log("Group created successfully:", resultAction.payload);

        // Reset form state
        setGroupName("");
        setSelectedUsers([]);
        setGroupImage(null);
        setGroupImagePreview(null);
        setShowGroupCreation(false);

        // Update conversation list immediately and wait for completion
        const fetchResult = await dispatch(fetchConversations()).unwrap();
        console.log("Conversation list updated:", fetchResult);

        // Then set active conversation
        const newConversation = resultAction.payload;

        // Ensure isGroup is set correctly
        const enhancedConversation = {
          ...newConversation,
          admin: currentUser._id,
          id: newConversation._id,
          name: newConversation.name || groupName,
          picture: newConversation.picture,
          lastSeen: "Group chat",
          isGroup: true, // Explicitly set isGroup
          participants:
            newConversation.participants || newConversation.users || [],
        };

        console.log("Activating new conversation:", enhancedConversation);
        setActiveConversation(enhancedConversation);

        // استدعاء دالة إخفاء القائمة في وضع الموبايل
        if (onChatSelect) {
          onChatSelect();
        }
      } else {
        console.error(
          "Failed to create group:",
          resultAction.error,
          resultAction
        );
        setError(
          resultAction.error?.message ||
            (typeof resultAction.error === "string"
              ? resultAction.error
              : JSON.stringify(resultAction.error)) ||
            "Failed to create group"
        );
      }
    } catch (error) {
      console.error("Error during group creation:", error);
      setError(error.message || "Unexpected error occurred");
    } finally {
      setLoading(false);
      setGroupCreationLoading(false);
    }
  };
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // إزالة البادئة data:image/jpeg;base64, للحصول على الـ base64 string فقط
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
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
        "Unknown User";

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
      setError(null); // إعادة تعيين حالة الخطأ
      dispatch({ type: "chat/searchUsers/fulfilled", payload: [] }); // إعادة تعيين نتائج البحث
    }
  };

  const filteredChats = useMemo(() => {
    console.log("All conversations:", conversations);

    if (!Array.isArray(conversations)) {
      console.log("Conversations is not an array!");
      return [];
    }

    if (!searchTerm || showUserSearch) {
      console.log(`Number of conversations: ${conversations.length}`);
      // Debug logs for each conversation
      conversations.forEach((chat, index) => {
        console.log(
          `Conversation #${index}:`,
          chat?._id,
          "isGroup:",
          chat?.isGroup,
          "isGroupChat:",
          chat?.isGroupChat,
          "type:",
          chat?.type,
          "name:",
          chat?.name
        );
      });
      return conversations;
    }

    const searchLower = searchTerm.toLowerCase();
    return conversations.filter((chat) => {
      if (!chat) return false;

      // تحقق من صحة المحادثة ووجود البيانات المطلوبة
      const nameMatch = chat.name?.toLowerCase()?.includes(searchLower);
      const messageMatch =
        chat.lastMessage?.message?.toLowerCase()?.includes(searchLower) ||
        chat.lastMessage?.content?.toLowerCase()?.includes(searchLower);
      return nameMatch || messageMatch;
    });
  }, [searchTerm, showUserSearch, conversations]);

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

  const handleConversationClick = (chat) => {
    // Determine conversation type
    const isGroupConvo = chat.isGroup === true;
    console.log(
      `Selecting conversation: ${chat._id}, type: ${
        isGroupConvo ? "group" : "individual"
      }`
    );

    // Find the other user in individual conversations
    let otherUser = null;
    if (!isGroupConvo && chat.participants) {
      otherUser = chat.participants.find((p) => p._id !== currentUser?._id);
    }

    // Prepare conversation data
    const conversationData = {
      id: chat._id,
      name: chat.name,
      picture: isGroupConvo
        ? getGroupImageUrl(chat.picture)
        : isValidImageUrl(chat.picture)
        ? chat.picture
        : Avatar,
      lastSeen: isGroupConvo ? "Group chat" : "Recently active",
      isGroup: isGroupConvo,
      participants: chat.participants || chat.users || [],
      otherUser: !isGroupConvo ? otherUser : null,
      admin: chat.admin,
    };

    console.log("Activating conversation:", conversationData);

    // تحديث المحادثة النشطة في سياق الشات
    setActiveConversation(conversationData);

    // تأكد من أن المحادثة النشطة تم تحديثها في Redux أيضًا
    dispatch({
      type: "chat/setActiveConversation",
      payload: conversationData,
    });

    // تحميل الرسائل للمحادثة المحددة
    dispatch(fetchMessages({ conversationId: chat._id }));

    // إغلاق أي واجهات بحث مفتوحة
    if (showUserSearch) {
      setShowUserSearch(false);
      setSearchTerm("");
    }

    // استدعاء دالة إخفاء القائمة في وضع الموبايل
    if (onChatSelect) {
      onChatSelect();
    }
  };
  console.log("All conversations:", conversations);
  console.log(`Number of conversations: ${conversations.length}`);

  console.log("Filtered chats", filteredChats);
  return (
    <div className="flex flex-col w-full h-full bg-gradient-to-b from-white to-gray-50/30 border-r border-t border-gray-200/60 shadow-sm">
      {/* Header with enhanced styling */}
      <div className="flex items-center justify-between w-full p-4 bg-white/80 backdrop-blur-sm">
        <h2 className="text-xl font-bold bg-gradient-to-r from-[#4d2d61] to-[#7b4397] bg-clip-text text-transparent">
          Conversations
        </h2>
        <div className="flex space-x-1">
          <button
            onClick={() => setShowUserSearch(true)}
            className="group p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-[#4d2d61]/10 hover:to-[#7b4397]/10 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#4D2D61]/20"
            title="Add New Chat"
          >
            <UserPlus
              className="w-5 h-5 text-[#4d2d61] group-hover:text-
            [#7b4397] transition-colors duration-300"
            />
          </button>

          <button
            onClick={handleGroupIconClick}
            className="group p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-[#4d2d61]/10 hover:to-[#7b4397]/10 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#4D2D61]/20"
            title="Create New Group"
          >
            <SquarePen className="w-5 h-5 text-[#4d2d61] group-hover:text-[#7b4397] transition-colors duration-300" />
          </button>
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="px-4 py-3 bg-white/50">
        <div className="relative group">
          <Search className="absolute left-3 top-4 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
          <input
            id="searchInput"
            type="text"
            placeholder={showUserSearch ? "Search users..." : "Search chats..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3.5 text-sm bg-white/80 backdrop-blur-sm rounded-xl border border-[#E5D8F6] focus:outline-none focus:ring-2 focus:ring-[#4D2D61]/20 focus:border-[#C1A7E6] text-gray-700 transition-all duration-300 hover:shadow-sm placeholder:text-gray-400"
          />
          {(showUserSearch || searchTerm) && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-4 text-gray-400 hover:text-[#4D2D61] transition-all duration-300 hover:scale-110"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {authChecking ? (
          <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-gradient-to-r from-[#4d2d61] to-[#7b4397]border-t-transparent"></div>
              <div className="absolute inset-0 animate-pulse rounded-full h-10 w-10 bg-gradient-to-r from-[#4d2d61]/20 to-[#7b4397]/20"></div>
            </div>
            <p className="text-gray-500 font-medium animate-pulse">
              Checking authentication...
            </p>
          </div>
        ) : !auth?.isAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-[#4d2d61]" />
            </div>
            <p className="text-gray-600 font-medium">
              Please login to view conversations
            </p>
          </div>
        ) : showUserSearch ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="px-2"
          >
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse flex items-center space-x-4 p-3 rounded-2xl bg-white/60"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                      <div className="w-1/2 h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm && searchResults && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  No users found matching "{searchTerm}"
                </p>
              </div>
            ) : searchTerm && Array.isArray(searchResults) ? (
              <div className="space-y-1 mt-2 px-2">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      No users found matching "{searchTerm}"
                    </p>
                  </div>
                ) : (
                  searchResults
                    .filter((user) => user._id !== currentUser?._id)
                    .map((user, index) => (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="group flex items-center p-4 cursor-pointer rounded-2xl hover:bg-gradient-to-r hover:from-[#4d2d61]/5 hover:to-[#7b4397]/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#4D2D61]/10 border border-transparent hover:border-[#4D2D61]/10"
                        onClick={() => handleUserClick(user)}
                      >
                        <div className="relative">
                          <img
                            src={
                              isValidImageUrl(user?.avatar)
                                ? getAvatarUrl(user.avatar)
                                : Avatar
                            }
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md group-hover:border-[#4D2D61]/20 transition-all duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = Avatar;
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="font-semibold text-gray-800 group-hover:text-[#4D2D61] transition-colors duration-300">
                            {highlightSearchTerm(
                              `${user.firstName} ${user.lastName}`,
                              searchTerm
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                            {highlightSearchTerm(
                              user.username || user.email,
                              searchTerm
                            )}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#7b4397] flex items-center justify-center">
                            <Plus className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium">Type to search users</p>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {status === "loading" ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse flex items-center space-x-4 p-4 rounded-2xl bg-white/60"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                      <div className="w-1/2 h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center text-red-500 mt-10 space-y-3">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <p className="font-medium">{error}</p>
              </div>
            ) : Array.isArray(filteredChats) && filteredChats.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="px-2 py-1"
              >
                {filteredChats.map((chat, index) => {
                  console.log(
                    `Rendering conversation:`,
                    chat._id,
                    "isGroup:",
                    chat.isGroup,
                    "isGroupChat:",
                    chat.isGroupChat,
                    "type:",
                    chat.type,
                    "name:",
                    chat.name,
                    " admin :",
                    chat.admin
                  );

                  return (
                    <motion.div
                      key={chat._id || chat.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ConversationItem
                        chat={chat}
                        currentUser={currentUser}
                        isActive={activeChat?.id === chat._id}
                        onConversationClick={handleConversationClick}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : !Array.isArray(conversations) ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-50 to-red-100 flex items-center justify-center">
                  <X className="w-10 h-10 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-600 font-medium">
                    Error loading conversations
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Please refresh the page
                  </p>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 flex items-center justify-center">
                  <UserPlus className="w-10 h-10 text-[#4d2d61]" />
                </div>
                <div>
                  <p className="text-gray-600 font-medium">
                    No conversations yet
                  </p>
                  <p className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1">
                    Click the{" "}
                    <UserPlus className="inline w-4 h-4 text-[#4d2d61]" /> icon
                    to start a new chat
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium">
                  {searchTerm
                    ? `No conversations found matching "${searchTerm}"`
                    : "Your conversation list is empty"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Group Creation Modal */}
      {showGroupCreation && (
        <motion.div
          className="fixed inset-0 bg-black/5 backdrop-blur-[1px] flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => setShowGroupCreation(false)}
        >
          <motion.div
            className="bg-white rounded-3xl w-[400px] shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white">
              <h3 className="text-xl font-bold">Create New Group</h3>
              <p className="text-white/80 text-sm mt-1">
                Start a conversation with multiple people
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block mb-3 text-sm font-semibold text-gray-700">
                  Group Picture (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                      {groupImagePreview ? (
                        <img
                          src={groupImagePreview || "/placeholder.svg"}
                          alt="Group preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      )}
                    </div>
                    {groupImagePreview && (
                      <button
                        onClick={() => {
                          setGroupImage(null);
                          setGroupImagePreview(null);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="groupImage"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="groupImage"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Choose Photo
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: Square image, max 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="groupName"
                  className="block mb-3 text-sm font-semibold text-gray-700"
                >
                  Group Name
                </label>
                <input
                  type="text"
                  id="groupName"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4D2D61]/20 focus:border-[#4D2D61]/40 transition-all duration-300 bg-gray-50/50 hover:bg-white"
                />
              </div>

              <div>
                <label className="block mb-3 text-sm font-semibold text-gray-700">
                  Select Participants
                </label>
                <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/30">
                  {loading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#4D2D61] border-t-transparent mx-auto"></div>
                      <p className="mt-3 text-sm text-gray-500 font-medium">
                        Loading users...
                      </p>
                    </div>
                  ) : users && users.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
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
                          "Unknown User";

                        return (
                          <div
                            key={user._id}
                            className={`flex items-center p-3 hover:bg-white cursor-pointer rounded-xl transition-all duration-300 ${
                              isSelected
                                ? "bg-gradient-to-r from-[#4D2D61]/5 to-[#7b4397]/5 border border-[#4D2D61]/20"
                                : "hover:shadow-md"
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
                              className="mr-3 w-4 h-4 text-[#4D2D61] rounded focus:ring-[#4D2D61]/20"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-800">
                                {displayName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.email}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#7b4397] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium">No users available</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">
                    {selectedUsers.length} users selected
                  </span>
                  {selectedUsers.length > 0 && (
                    <button
                      className="text-[#4D2D61] hover:text-[#7b4397]font-medium transition-colors duration-300"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 bg-gray-50/50 border-t border-gray-100">
              <button
                type="button"
                className="px-6 py-3 bg-white text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-medium border border-gray-200 hover:border-gray-300"
                onClick={() => setShowGroupCreation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-3 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white rounded-2xl hover:shadow-lg hover:shadow-[#4D2D61]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium hover:scale-105"
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
