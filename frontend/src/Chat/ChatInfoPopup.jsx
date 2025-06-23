import { memo, useState, useMemo, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Minus, UserMinus, LogOut } from "lucide-react";
import { getAllUsers } from "../features/Slice/ChatSlice/chatSlice";
import { useChat } from "../context/chat-context";
import defaultAvatar from "../assets/defaultAvatar.png";
import { isValidImageUrl } from "../utils/imageUtils";
import ConfirmationDialog from "./ConfirmationDialog";
import axios from "../utils/axiosConfig";

const ChatInfoPopup = memo(
  ({
    showPopup,
    onClose,
    activeChat,
    participants,
    isAdmin,
    onAddUser,
    onRemoveUser,
    onLeaveGroup,
    hasLeftGroup = false,
    onDeleteGroup,
    onDeleteConversation,
  }) => {
    const dispatch = useDispatch();
    const { currentUser } = useChat();
    const allUsers = useSelector((state) => state.chat.users || []);
    const popupRef = useRef(null);

    const [showAddUserPopup, setShowAddUserPopup] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [participantsWithStatus, setParticipantsWithStatus] = useState([]);

    // Confirmation dialog states
    const [confirmDialog, setConfirmDialog] = useState({
      isOpen: false,
      type: "danger",
      title: "",
      message: "",
      onConfirm: null,
      userToRemove: null,
    });

    // Load users when needed
    useEffect(() => {
      if (showAddUserPopup && allUsers.length === 0) {
        dispatch(getAllUsers());
      }
    }, [showAddUserPopup, dispatch, allUsers.length]);

    // Reset showAddUserPopup when popup is first opened
    useEffect(() => {
      if (showPopup) {
        setShowAddUserPopup(false);
      }
    }, [showPopup]);

    // Fetch members status
    useEffect(() => {
      const fetchMembersStatus = async () => {
        if (showPopup && activeChat?.isGroup && participants.length > 0) {
          try {
            const ids = participants.map((u) => u._id);
            const { data } = await axios.post("/api/v1/users/statuses", {
              ids,
            });
            // data.users: [{ _id, status, ... }]
            if (data.status === "success" && Array.isArray(data.users)) {
              setParticipantsWithStatus(
                participants.map((u) => ({
                  ...u,
                  status:
                    data.users.find((d) => d._id === u._id)?.status || u.status,
                }))
              );
            } else {
              setParticipantsWithStatus(participants); // fallback
            }
          } catch (err) {
            setParticipantsWithStatus(participants); // fallback
          }
        } else {
          setParticipantsWithStatus(participants);
        }
      };
      fetchMembersStatus();
    }, [showPopup, activeChat, participants]);

    // Click outside handler
    useEffect(() => {
      const handleClickOutside = (e) => {
        // Don't close popup if confirmation dialog is open
        if (confirmDialog.isOpen) {
          return;
        }

        if (popupRef.current && !popupRef.current.contains(e.target)) {
          onClose();
        }
      };

      const handleEsc = (e) => {
        // Don't close popup with Escape if confirmation dialog is open
        if (e.key === "Escape" && !confirmDialog.isOpen) {
          onClose();
        }
      };

      if (showPopup) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEsc);
      };
    }, [showPopup, onClose, confirmDialog.isOpen]);

    // Reset confirmation dialog when popup opens (not when ConfirmationDialog closes)
    useEffect(() => {
      if (showPopup) {
        // Reset the confirmation dialog state when popup first opens
        setConfirmDialog({
          isOpen: false,
          type: "danger",
          title: "",
          message: "",
          onConfirm: null,
          userToRemove: null,
        });
      }
    }, [showPopup]);

    const handleAddUser = (userIds) => {
      if (activeChat?.id) {
        onAddUser(userIds);
        setShowAddUserPopup(false);
        setSelectedUsers([]);
      }
    };

    const handleRemoveUser = (userId) => {
      const userToRemove = participantsWithStatus.find((u) => u._id === userId);
      setConfirmDialog({
        isOpen: true,
        type: "info",
        title: "Remove Member",
        message: `Are you sure you want to remove "${
          userToRemove?.fullName || userToRemove?.name || userToRemove?.username
        }" from the group?`,
        onConfirm: (e) => {
          // Prevent any browser/Windows dialogs - only use custom confirmation
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            e.nativeEvent?.stopImmediatePropagation?.();
          }

          // Execute action only through custom dialog confirmation
          if (activeChat?.id) {
            onRemoveUser(userId);
          }
          closeConfirmDialog();
        },
        confirmText: "Remove",
        cancelText: "Cancel",
      });
    };

    const handleLeaveGroup = () => {
      // Don't allow leaving if already left
      if (hasLeftGroup) return;

      setConfirmDialog({
        isOpen: true,
        type: "info",
        title: "Leave Group",
        message:
          "Are you sure you want to leave this group? You will no longer be able to see new messages after leaving.",
        onConfirm: (e) => {
          // Prevent any browser/Windows dialogs - only use custom confirmation
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            e.nativeEvent?.stopImmediatePropagation?.();
          }

          // Execute action only through custom dialog confirmation
          if (activeChat?.id) {
            onLeaveGroup();
            onClose();
          }
          closeConfirmDialog();
        },
        confirmText: "Leave",
        cancelText: "Cancel",
      });
    };

    const closeConfirmDialog = (e) => {
      // Prevent any event propagation that might trigger browser dialogs
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        e.nativeEvent?.stopImmediatePropagation?.();
      }
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
      }));
    };

    const toggleUserSelection = (userId) => {
      if (selectedUsers.includes(userId)) {
        setSelectedUsers(selectedUsers.filter((id) => id !== userId));
      } else {
        setSelectedUsers([...selectedUsers, userId]);
      }
    };

    const handleAddSelectedUsers = () => {
      if (selectedUsers.length > 0) {
        handleAddUser(selectedUsers);
        // Only close the add user section, not the main popup
        setShowAddUserPopup(false);
      }
    };

    if (!showPopup || !activeChat) return null;

    // Pre-calculate admin status for group members
    const isGroupAdmin = activeChat.isGroup && isAdmin;

    return (
      <>
        <AnimatePresence>
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-16 right-4 bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100/50 rounded-3xl overflow-hidden z-[9000] w-80 max-h-[65vh]"
            style={{
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Modern Header with Custom Purple Gradient */}
            <div
              className="relative p-5"
              style={{
                background: "linear-gradient(to right, #4d2d61,#7b4397)",
              }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative flex justify-between items-center">
                <div>
                  <h4 className="text-white font-bold text-lg tracking-tight">
                    {activeChat.isGroup ? "Group Members" : "User Info"}
                  </h4>
                  <p className="text-white/80 text-sm mt-1">
                    {participants.length}{" "}
                    {participants.length === 1 ? "member" : "members"}
                  </p>
                </div>
                {isGroupAdmin && !hasLeftGroup && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddUserPopup((prev) => !prev)}
                    className="p-2.5 bg-white/20 backdrop-blur-sm text-white rounded-2xl hover:bg-white/30 transition-all duration-300 shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="p-5 max-h-[calc(65vh-90px)] overflow-y-auto custom-scrollbar">
              {/* Left Group Message */}
              {hasLeftGroup && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-600 font-medium text-sm">
                      You have left this group
                    </span>
                  </div>
                </motion.div>
              )}
              {/* Add User Section */}
              <AnimatePresence>
                {showAddUserPopup &&
                  activeChat.isGroup &&
                  isAdmin &&
                  !hasLeftGroup && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-4 border border-gray-200/50"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-gray-800 font-semibold text-sm flex items-center gap-2">
                          <UserPlus
                            className="w-3 h-3"
                            style={{ color: "#7b4397" }}
                          />
                          Add New Members
                        </h5>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowAddUserPopup(false)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all duration-200"
                        >
                          <X className="h-3 w-3" />
                        </motion.button>
                      </div>

                      <div className="max-h-32 overflow-y-auto mb-2 custom-scrollbar">
                        <div className="space-y-1.5">
                          {allUsers?.filter(Boolean).map((user, index) => {
                            const alreadyInGroup = participants.some(
                              (u) => u._id === user._id
                            );
                            return (
                              <motion.div
                                key={user._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                                  alreadyInGroup
                                    ? "bg-gray-100 opacity-50 cursor-not-allowed"
                                    : selectedUsers.includes(user._id)
                                    ? "border border-gray-200"
                                    : "bg-white hover:bg-gray-50 border border-gray-100"
                                }`}
                                style={
                                  selectedUsers.includes(user._id) &&
                                  !alreadyInGroup
                                    ? {
                                        background:
                                          "linear-gradient(to right, rgba(77, 45, 97, 0.1), rgba(107, 70, 193, 0.1))",
                                        borderColor: "#7b4397",
                                      }
                                    : {}
                                }
                                onClick={() => {
                                  if (!alreadyInGroup) {
                                    toggleUserSelection(user._id);
                                  }
                                }}
                              >
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user._id)}
                                    onChange={() => {
                                      if (!alreadyInGroup) {
                                        toggleUserSelection(user._id);
                                      }
                                    }}
                                    disabled={alreadyInGroup}
                                    className="h-3 w-3 rounded border-gray-300 focus:ring-2"
                                    style={{
                                      accentColor: "#7b4397",
                                    }}
                                  />
                                </div>
                                <div className="relative">
                                  <img
                                    src={user.avatar || ""}
                                    onError={(e) => {
                                      e.target.onerror = null; // Prevent infinite loops
                                      const name =
                                        user.fullName ||
                                        user.name ||
                                        user.username ||
                                        "User";
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        name
                                      )}&background=4D2D61&color=fff&bold=true&size=128`;
                                    }}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                    alt={user.name}
                                  />
                                  {!alreadyInGroup && (
                                    <div
                                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${
                                        user.status === "online"
                                          ? "bg-green-500"
                                          : "bg-gray-400"
                                      }`}
                                    ></div>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium text-gray-800 truncate text-xs">
                                    {user.fullName ||
                                      user.name ||
                                      user.username}
                                  </span>
                                  <span className="text-xs text-gray-500 truncate">
                                    {alreadyInGroup
                                      ? "Already in group"
                                      : user.email}
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddSelectedUsers}
                        disabled={selectedUsers.length === 0}
                        className={`w-full text-xs py-2.5 px-3 rounded-xl font-medium transition-all duration-300 ${
                          selectedUsers.length > 0
                            ? "text-white shadow-lg hover:shadow-xl"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                        style={
                          selectedUsers.length > 0
                            ? {
                                background:
                                  "linear-gradient(to right, #4d2d61, #7b4397)",
                              }
                            : {}
                        }
                        onMouseEnter={(e) => {
                          if (selectedUsers.length > 0) {
                            e.target.style.background =
                              "linear-gradient(to right, #4d2d61, #7b4397)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedUsers.length > 0) {
                            e.target.style.background =
                              "linear-gradient(to right, #4d2d61, #7b4397)";
                          }
                        }}
                      >
                        Add {selectedUsers.length}{" "}
                        {selectedUsers.length === 1 ? "Member" : "Members"}
                      </motion.button>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Members List */}
              <div className="space-y-2.5">
                {participantsWithStatus.map((user, index) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group flex items-center justify-between gap-3 p-3 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 rounded-2xl transition-all duration-300 border border-gray-100/50 hover:border-gray-200/50 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <img
                          src={user.avatar || ""}
                          onError={(e) => {
                            e.target.onerror = null; // Prevent infinite loops
                            const name =
                              user.fullName ||
                              user.name ||
                              user.username ||
                              "User";
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              name
                            )}&background=4D2D61&color=fff&bold=true&size=128`;
                          }}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                          alt="avatar"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                            user.status === "online"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        ></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {user.fullName || user.name || user.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email || "No email"}
                        </p>
                      </div>
                    </div>
                    {activeChat.isGroup &&
                      isAdmin &&
                      !hasLeftGroup &&
                      user._id !== currentUser?._id && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveUser(user._id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                          title="Remove User"
                        >
                          <UserMinus className="h-3 w-3" />
                        </motion.button>
                      )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Leave Group Button */}
            {activeChat.isGroup && !isAdmin && (
              <div className="p-5 pt-0">
                <motion.button
                  whileHover={!hasLeftGroup ? { scale: 1.02 } : {}}
                  whileTap={!hasLeftGroup ? { scale: 0.98 } : {}}
                  onClick={handleLeaveGroup}
                  disabled={hasLeftGroup}
                  className={`w-full text-xs py-2.5 px-3 rounded-xl font-medium shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                    hasLeftGroup
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:from-[#4d2d61] hover:to-[#7b4397] text-white hover:shadow-xl"
                  }`}
                >
                  <LogOut className="w-3 h-3" />
                  {hasLeftGroup ? "Already Left" : "Leave Group"}
                </motion.button>
              </div>
            )}

            {activeChat.isGroup && isAdmin && !hasLeftGroup && (
              <div className="p-5 pt-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      type: "danger",
                      title: "Delete Group",
                      message:
                        "Are you sure you want to permanently delete this group? This action cannot be undone.",
                      onConfirm: (e) => {
                        if (e) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                        if (onDeleteGroup) onDeleteGroup();
                        closeConfirmDialog();
                      },
                      confirmText: "Delete Group",
                      cancelText: "Cancel",
                    })
                  }
                  className="w-full text-xs py-2.5 px-3 rounded-xl font-medium shadow-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:from-[#4d2d61] hover:to-[#7b4397] text-white hover:shadow-xl mt-2"
                >
                  <X className="w-3 h-3" />
                  Delete Group
                </motion.button>
              </div>
            )}

            {!activeChat.isGroup && (
              <div className="p-5 pt-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      type: "danger",
                      title: "Delete Conversation",
                      message:
                        "Are you sure you want to permanently delete this conversation? This action cannot be undone.",
                      onConfirm: (e) => {
                        if (e) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                        if (onDeleteConversation) onDeleteConversation();
                        closeConfirmDialog();
                      },
                      confirmText: "Delete Conversation",
                      cancelText: "Cancel",
                    })
                  }
                  className="w-full text-xs py-2.5 px-3 rounded-xl font-medium shadow-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:from-[#4d2d61] hover:to-[#7b4397] text-white hover:shadow-xl mt-2"
                >
                  <X className="w-3 h-3" />
                  Delete Conversation
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirmDialog}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          type={confirmDialog.type}
          icon={confirmDialog.title === "Leave Group" ? LogOut : UserMinus}
        />
      </>
    );
  }
);

ChatInfoPopup.displayName = "ChatInfoPopup";

export default ChatInfoPopup;
