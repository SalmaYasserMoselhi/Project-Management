"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Paperclip, Send, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import {
  sendMessage,
  addMessage,
  updateConversationLastMessage,
  updateConversationInList,
  toggleEmojiPicker,
  closeEmojiPicker,
  sendFileMessage,
} from "../features/Slice/ChatSlice/chatSlice";
import { emitTyping, emitStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const ChatInput = ({ chatId }) => {
  const dispatch = useDispatch();
  const { currentUser } = useChat();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationFromStore = useSelector((state) =>
    state.chat.conversations.find((c) => c._id === chatId)
  );
  const showEmojiPicker = useSelector((state) => state.chat.showEmojiPicker);

  // Handle emoji picker visibility
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

  // Handle typing status
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      emitTyping(chatId);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emitStopTyping(chatId);
    }, 3000);
  }, [chatId, isTyping]);

  // Handle emoji selection
  const handleEmojiClick = useCallback(
    (emojiData) => {
      setMessage((prev) => prev + emojiData.emoji);
      dispatch(closeEmojiPicker());
      textareaRef.current?.focus();
    },
    [dispatch]
  );

  // Handle file selection
  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const result = await dispatch(
        sendFileMessage({
          conversationId: chatId,
          files: files,
        })
      ).unwrap();

      // Update conversation with the new message
      if (conversationFromStore) {
        dispatch(
          updateConversationInList({
            ...conversationFromStore,
            lastMessage: result,
          })
        );
      }
    } catch (error) {
      console.error("Failed to send file:", error);
      toast.error(error || "Failed to send file");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle message submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const trimmedMessage = message.trim();
      if (!trimmedMessage) return;

      const tempMessage = {
        _id: `temp-${Date.now()}`,
        content: trimmedMessage,
        sender: { _id: currentUser._id },
        conversationId: chatId,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      dispatch(addMessage(tempMessage));
      setMessage("");

      try {
        const result = await dispatch(
          sendMessage({
            conversationId: chatId,
            content: trimmedMessage,
            isEmoji: /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(trimmedMessage),
          })
        ).unwrap();

        // Batch updates for better performance
        requestAnimationFrame(() => {
          dispatch(
            updateConversationLastMessage({
              conversationId: chatId,
              message: result,
            })
          );

          if (conversationFromStore) {
            dispatch(
              updateConversationInList({
                ...conversationFromStore,
                lastMessage: result,
              })
            );
          }
        });
      } catch (error) {
        console.error("❌ Failed to send message:", error);
      }
    },
    [message, currentUser._id, chatId, dispatch, conversationFromStore]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  // Setup textarea auto-resize
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
    };

    resize();

    observerRef.current = new ResizeObserver(resize);
    observerRef.current.observe(textarea);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [message]);

  // Setup click outside listener
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      emitStopTyping(chatId);
    };
  }, [chatId]);

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
              {/* Emoji Picker */}
              <div className="relative" ref={emojiPickerRef}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 text-gray-500 rounded-2xl transition-all duration-200"
                  style={{
                    color: showEmojiPicker ? "#6B46C1" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#6B46C1";
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

              {/* File Attachment */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 text-gray-500 rounded-2xl transition-all duration-200"
                onMouseEnter={(e) => {
                  e.target.style.color = "#6B46C1";
                  e.target.style.backgroundColor = "rgba(107, 70, 193, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#6b7280";
                  e.target.style.backgroundColor = "transparent";
                }}
                title="Attach File"
                onClick={() => fileInputRef.current?.click()}
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

            {/* Message Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type a message..."
                className="w-full bg-transparent rounded-2xl px-3 py-1 outline-none resize-none max-h-[80px] text-gray-800 placeholder-gray-400 text-sm leading-relaxed min-h-[32px]"
                rows={1}
              />
            </div>

            {/* Send Button */}
            <motion.button
              type="submit"
              disabled={message.trim().length === 0}
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
                      background: "linear-gradient(to right, #4D2D61, #6B46C1)",
                    }
                  : {}
              }
              onMouseEnter={(e) => {
                if (message.trim().length > 0) {
                  e.target.style.background =
                    "linear-gradient(to right, #3D1D51, #5B36B1)";
                }
              }}
              onMouseLeave={(e) => {
                if (message.trim().length > 0) {
                  e.target.style.background =
                    "linear-gradient(to right, #4D2D61, #6B46C1)";
                }
              }}
              title="Send Message"
            >
              <motion.div
                animate={{
                  rotate: message.trim().length > 0 ? 0 : -45,
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
