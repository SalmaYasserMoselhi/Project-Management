// frontend/src/Chat/ChatInput.jsx

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Paperclip, Send, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import {
  addMessage, // Used for immediate sender display of temp message
  sendFileMessage, // Still uses direct API for files, consider updating for socket if needed
  updateConversationInList, // Used for updating last message when file is sent via API
  toggleEmojiPicker,
  closeEmojiPicker,
  replaceFileMessage, // New action to replace temp file message
} from "../features/Slice/ChatSlice/chatSlice";
import { emitTyping, emitStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context"; // Import useChat to get sendMessage from context
import { toast } from "react-hot-toast"; // For displaying notifications
import { motion, AnimatePresence } from "framer-motion"; // For animations

const ChatInput = ({ chatId }) => {
  const dispatch = useDispatch();
  // --- FIX: Destructure sendMessage from useChat context ---
  const { currentUser, sendMessage } = useChat();
  // --- END FIX ---
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false); // Local typing state, separate from global Redux state
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  // conversationFromStore is used mainly for `updateConversationInList` after sending files directly via API
  const conversationFromStore = useSelector((state) =>
    state.chat.conversations.find((c) => c._id === chatId)
  );
  const showEmojiPicker = useSelector((state) => state.chat.showEmojiPicker);

  // Handle emoji picker visibility (click outside to close)
  const handleClickOutside = useCallback(
    (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        dispatch(closeEmojiPicker());
      }
    },
    [dispatch]
  );

  // Handle local typing state and emit socket events
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      // Only emit 'typing' if we weren't already typing
      setIsTyping(true);
      emitTyping(chatId); // Emit 'typing' event via socket
    }

    // Clear any existing timeout and set a new one
    // This ensures 'stop typing' is sent if typing stops for 3 seconds
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false); // Update local state
      emitStopTyping(chatId); // Emit 'stop typing' event via socket
    }, 3000);
  }, [chatId, isTyping]); // Dependencies for useCallback

  // Handle emoji selection from the picker
  const handleEmojiClick = useCallback(
    (emojiData) => {
      setMessage((prev) => prev + emojiData.emoji); // Add emoji to message input
      dispatch(closeEmojiPicker()); // Close emoji picker
      textareaRef.current?.focus(); // Focus back on textarea
    },
    [dispatch]
  );

  // Handle file selection and sending (currently via direct API, not socket)
  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Optional: Add a temporary file message to UI for immediate feedback
    const tempFileMessage = {
      _id: `temp-file-${Date.now()}`,
      content: `Sending file: ${files[0].name}...`, // Placeholder text
      sender: { _id: currentUser._id }, // Current user as sender
      conversationId: chatId, // Current conversation ID
      createdAt: new Date().toISOString(),
      status: "sending",
      // You might add specific file details like file.name, file.size, type etc.
      type: "file_placeholder", // Custom type to indicate it's a temporary file message
    };
    dispatch(addMessage(tempFileMessage)); // Optimistically add to sender's UI

    try {
      // Dispatch the thunk to send file via API
      const result = await dispatch(
        sendFileMessage({
          conversationId: chatId,
          files: files,
        })
      ).unwrap(); // `unwrap` to get the actual API response data

      // Find and replace the temporary file message with the actual file message
      dispatch(
        replaceFileMessage({
          tempMessageId: tempFileMessage._id,
          serverMessage: result,
        })
      );

      // Update the conversation list with the new file message's info
      if (conversationFromStore) {
        dispatch(
          updateConversationInList({
            ...conversationFromStore,
            lastMessage: result, // result is the final message data from API
          })
        );
      }
      toast.success("File sent successfully!"); // Show success toast
    } catch (error) {
      console.error("ChatInput: Failed to send file:", error);
      toast.error(error.message || "Failed to send file"); // Show error toast
      // You might want to update the status of `tempFileMessage` to 'failed' here in Redux
    } finally {
      // Reset file input regardless of success/failure
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle text/emoji message submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        console.log("ChatInput: Message is empty, not sending.");
        return;
      }

      console.log(
        "ChatInput: handleSubmit triggered. Preparing message for socket."
      );
      const tempMessage = {
        _id: `temp-${Date.now()}`, // Temporary ID for immediate display
        content: trimmedMessage,
        sender: { _id: currentUser._id }, // Sender ID from current user
        conversationId: chatId, // Current conversation ID
        createdAt: new Date().toISOString(),
        status: "sending", // Temporary status
      };

      // Add temporary message to sender's UI immediately for good UX
      dispatch(addMessage(tempMessage));
      setMessage(""); // Clear input field immediately

      try {
        // Dispatch the `sendMessage` function obtained from `useChat` context.
        // This `sendMessage` now correctly calls `emitSocketMessage` from `utils/socket.js`.
        // We `await` it to ensure the socket emission process *initiates* and gets an acknowledgment.
        const sendSuccess = await sendMessage({
          conversationId: chatId,
          content: trimmedMessage,
          isEmoji: /^[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]$/.test(trimmedMessage),
          // Optionally pass tempMessage._id for the backend to use/return for matching
        });

        if (!sendSuccess) {
          console.error(
            "ChatInput: sendMessage context call indicated failure."
          );
          toast.error("Message failed to send. Check connection."); // User-friendly error
        } else {
          console.log("ChatInput: Message successfully initiated via socket.");
          // The actual message addition/update in Redux (with final server ID/timestamp)
          // will happen when the 'receive message' event comes back from the server,
          // which is handled by the `onMessage` listener in `ChatContext`.
        }
      } catch (error) {
        // This catch block would only be hit if the `sendMessage` function itself throws an unexpected error,
        // or if `emitWithAck` rejects its promise due to a severe connection issue.
        console.error(
          "ChatInput: Unexpected error calling sendMessage (context):",
          error
        );
        toast.error(`Error initiating message send: ${error.message}`);
      }
    },
    // Dependencies: message, currentUser's ID, chatId, dispatch, and the sendMessage function itself
    [message, currentUser?._id, chatId, dispatch, sendMessage]
  );

  // Handle keyboard shortcuts (e.g., Enter to send)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Send on Enter, allow Shift+Enter for new line
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit] // Dependency: handleSubmit must be stable
  );

  // Setup textarea auto-resize based on content
  useEffect(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const resize = () => {
      textarea.style.height = "auto"; // Reset height
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`; // Set to scroll height, max 80px
    };
    resize(); // Initial resize
    observerRef.current = new ResizeObserver(resize); // Observe for content changes
    observerRef.current.observe(textarea);
    return () => {
      observerRef.current?.disconnect(); // Cleanup observer
    };
  }, [message]); // Dependency: re-run if message content changes

  // Setup click outside listener for emoji picker
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]); // Dependency: handleClickOutside must be stable

  // Cleanup typing timeout when component unmounts or chat changes
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current); // Clear pending timeout
      emitStopTyping(chatId); // Ensure 'stop typing' is sent
    };
  }, [chatId]); // Dependency: re-run if chat changes

  return (
    <div className="relative">
      {/* Floating Input Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-0 left-0 right-0 p-2 flex justify-center backdrop-blur-sm"
        style={{ backgroundColor: "#f5f5f5" }}
      >
        <motion.div
          animate={{
            scale: isFocused ? 1.01 : 1,
            boxShadow: isFocused
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          }}
          transition={{ duration: 0.2 }}
          className="backdrop-blur-xl rounded-3xl border border-gray-200/30 overflow-visible w-[95%] relative"
          style={{ backgroundColor: "#ffffff" }}
        >
          <form
            onSubmit={handleSubmit}
            className="flex items-center p-1.5 gap-2"
          >
            {/* Left Actions */}
            <div className="flex items-center gap-1 relative">
              {/* Emoji Picker Button */}
              <div className="relative" ref={emojiPickerRef}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 text-gray-500 rounded-2xl transition-all duration-200"
                  style={{
                    color: showEmojiPicker ? "#7b4397" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#7b4397";
                    e.target.style.backgroundColor = "rgba(107, 70, 193, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    if (!showEmojiPicker) {
                      e.target.style.color = "#6b7280";
                      e.target.style.backgroundColor = "transparent";
                    }
                  }}
                  title="Add Emoji"
                  onClick={() => dispatch(toggleEmojiPicker())}
                >
                  <Smile className="w-5 h-5" />
                </motion.button>

                {/* Emoji Picker Popup */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute bottom-full left-0 mb-3 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 bg-white"
                      style={{ zIndex: 99999 }}
                    >
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* File Attachment Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 text-gray-500 rounded-2xl transition-all duration-200"
                onMouseEnter={(e) => {
                  e.target.style.color = "#7b4397";
                  e.target.style.backgroundColor = "rgba(107, 70, 193, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#6b7280";
                  e.target.style.backgroundColor = "transparent";
                }}
                title="Attach File"
                onClick={() => fileInputRef.current?.click()} // Trigger hidden file input
              >
                <Paperclip className="w-5 h-5" />
              </motion.button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Message Input Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping(); // Call typing handler on change
                }}
                onKeyDown={handleKeyDown} // Handle Enter key
                onFocus={() => setIsFocused(true)} // UI state for focus animation
                onBlur={() => setIsFocused(false)}
                placeholder="Type a message..."
                className="w-full bg-transparent rounded-2xl px-3 py-1 outline-none resize-none max-h-[80px] text-gray-800 placeholder-gray-400 text-sm leading-relaxed min-h-[32px]"
                rows={1}
              />
            </div>

            {/* Send Button */}
            <motion.button
              type="submit"
              disabled={message.trim().length === 0} // Disable if message is empty
              whileHover={{ scale: message.trim().length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: message.trim().length > 0 ? 0.95 : 1 }}
              className={`relative p-2 rounded-2xl transition-all duration-300 ${
                message.trim().length > 0
                  ? "text-white shadow-lg hover:shadow-xl"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              style={
                message.trim().length > 0
                  ? {
                      background: "linear-gradient(to right, #4d2d61,#7b4397)",
                    }
                  : {}
              }
              onMouseEnter={(e) => {
                if (message.trim().length > 0) {
                  e.target.style.background =
                    "linear-gradient(to right,#4d2d61, #7b4397";
                }
              }}
              onMouseLeave={(e) => {
                if (message.trim().length > 0) {
                  e.target.style.background =
                    "linear-gradient(to right, #4d2d61, #7b4397)";
                }
              }}
              title="Send Message"
            >
              <motion.div
                animate={{
                  rotate: message.trim().length > 0 ? 0 : -45, // Rotate icon on message presence
                  scale: message.trim().length > 0 ? 1 : 0.9,
                }}
                transition={{ duration: 0.2 }}
              >
                <Send className="w-5 h-5" />
              </motion.div>
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ChatInput;
