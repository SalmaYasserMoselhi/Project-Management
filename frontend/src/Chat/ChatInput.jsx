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
} from "../features/Slice/ChatSlice/chatSlice";
import { emitTyping, emitStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context";

const ChatInput = ({ chatId }) => {
  const dispatch = useDispatch();
  const { currentUser } = useChat();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);

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
    },
    [dispatch]
  );

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
        // تم تعديل الشرط هنا
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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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
    <div className="bg-[#F5F5F5] p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-2">
          <div className="emoji-picker-container" ref={emojiPickerRef}>
            <button
              type="button"
              className="p-1 text-[#4D2D61] transition-colors hover:text-[#57356A]"
              title="Add Emoji"
              onClick={() => dispatch(toggleEmojiPicker())}
            >
              <Smile className="w-5 h-5" />
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker-wrapper z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>

          <button
            type="button"
            className="p-1 text-[#4D2D61] transition-colors hover:text-[#57356A] mr-2"
            title="Attach File"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown} // تم تأكيد تواجد هذا الحدث
            placeholder="Type a message..."
            className="flex-1 bg-white rounded-lg px-3 py-2 outline-none resize-none max-h-32 text-gray-800 placeholder-gray-400 text-sm"
            rows={1}
          />

          <button
            type="submit"
            disabled={message.trim().length === 0}
            className="p-1 text-[#4D2D61] transition-colors hover:text-[#57356A] disabled:opacity-50 disabled:cursor-not-allowed ml-2"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
