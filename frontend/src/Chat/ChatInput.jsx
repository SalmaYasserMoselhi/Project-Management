import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Paperclip, Send, Smile } from "lucide-react";
import {
  sendMessage,
  addMessage,
  updateConversationLastMessage,
  updateConversationInList,
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
  const conversationFromStore = useSelector((state) =>
    state.chat.conversations.find((c) => c._id === chatId)
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        emitStopTyping(chatId);
      }
    };
  }, [chatId, isTyping]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      emitTyping(chatId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emitStopTyping(chatId);
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content: message,
      sender: { _id: currentUser._id },
      conversationId: chatId,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    dispatch(addMessage(tempMessage));
    setMessage("");
    textareaRef.current.style.height = "auto";

    try {
      const result = await dispatch(
        sendMessage({
          conversationId: chatId,
          content: message,
        })
      ).unwrap();

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
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-[#F5F5F5]  p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-2">
          <button
            type="button"
            className="p-1 text-[#4D2D61] transition-colors hover:text-[#57356A]"
            title="Add Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

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
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-white rounded-lg px-3 py-2 outline-none resize-none max-h-32 text-gray-800 placeholder-gray-400 text-sm"
            rows={1}
          />

          <button
            type="submit"
            disabled={!message.trim()}
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
