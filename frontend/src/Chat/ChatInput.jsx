// import { useState } from "react";
// import { Smile, SendHorizontal } from "lucide-react";

// function ChatInput() {
//   const [message, setMessage] = useState("");

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (message.trim()) {
//       console.log("Sending message:", message);
//       setMessage("");
//     }
//   };

//   return (
//     <div className="bg-white px-1 py-3 flex items-center justify-center">
//       <form
//         onSubmit={handleSubmit}
//         className="flex items-center w-[90%] max-w-[95%]] h-[56px] bg-white rounded-[14px] border border-gray-300 px-4 shadow-md"
//       >
//         {/* زر الإيموجي */}
//         <button type="button" className="text-gray-500 hover:text-gray-700">
//           <Smile className="h-6 w-6" />
//         </button>

//         {/* حقل إدخال النص */}
//         <input
//           type="text"
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//           placeholder="Message"
//           className="flex-1 bg-transparent focus:outline-none text-gray-700 mx-3 text-sm"
//         />

//         {/* زر الإرسال */}
//         <button
//           type="submit"
//           className={`ml-2 ${
//             message.trim()
//               ? "text-purple-700 hover:text-purple-900"
//               : "text-gray-400"
//           }`}
//           disabled={!message.trim()}
//         >
//           <SendHorizontal className="h-6 w-6 text-[#4D2D61] " />
//         </button>
//       </form>
//     </div>
//   );
// }

// export default ChatInput;

import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Paperclip, Send } from "lucide-react";
import { sendMessage } from "../features/Slice/ChatSlice/chatSlice";
import { emitTyping, emitStopTyping } from "../utils/socket";

const ChatInput = ({ chatId }) => {
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        await dispatch(
          sendMessage({
            conversationId: chatId,
            content: message.trim(),
          })
        ).unwrap();
        setMessage("");
        if (isTyping) {
          setIsTyping(false);
          emitStopTyping(chatId);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-white border-t">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61]"
          title="Attach File"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none resize-none max-h-32 text-gray-800 placeholder-gray-400"
            rows={1}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim()}
          className="p-2 hover:bg-gray-100 rounded-full text-[#4D2D61] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
