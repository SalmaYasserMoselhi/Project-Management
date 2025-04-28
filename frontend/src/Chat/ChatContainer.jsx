// "use client";

// import { useEffect } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import ChatHeader from "./ChatHeader";
// import ChatMessages from "./ChatMessages";
// import ChatInput from "./ChatInput";
// import { setMessages, addMessage, setIsTyping } from "../features/chatSlice";
// import { onMessage, onTyping, onStopTyping } from "../utils/socket";

// function ChatContainer() {
//   const { activeChat } = useContext(ChatContext);

//   const messages = [
//     {
//       id: 1,
//       text: "OMG 😂 do you remember what you did last night at the work night out?",
//       time: "18:12",
//       isSender: false,
//       reactions: ["❤️"],
//     },
//     {
//       id: 2,
//       text: "no haha",
//       time: "18:16",
//       isSender: true,
//       status: "read",
//     },
//     {
//       id: 3,
//       text: "I don't remember anything 😂",
//       time: "18:16",
//       isSender: true,
//       status: "read",
//     },
//   ];

//   return (
//     <div className="flex flex-col flex-1 h-screen bg-white">
//       <ChatHeader user={activeChat} />
//       <ChatMessages messages={messages} />
//       <ChatInput />
//     </div>
//   );
// }

// export default ChatContainer;
"use client";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import {
  addMessage,
  setIsTyping,
  fetchMessages,
  clearMessages,
} from "../features/Slice/ChatSlice/chatSlice";
import { onMessage, onTyping, onStopTyping } from "../utils/socket";
import { useChat } from "../context/chat-context";

function ChatContainer() {
  const dispatch = useDispatch();
  const { activeChat, messages, isTyping } = useSelector((state) => state.chat);
  const { currentUser } = useChat();

  useEffect(() => {
    if (activeChat) {
      // Load previous messages when active chat changes
      dispatch(fetchMessages({ conversationId: activeChat.id }));

      // Setup Socket.IO listeners with cleanup
      const messageCleanup = onMessage((message) => {
        if (message.conversationId === activeChat.id) {
          dispatch(addMessage(message));
        }
      });

      const typingCleanup = onTyping(({ chatId, userId }) => {
        if (chatId === activeChat.id && userId !== currentUser?.id) {
          dispatch(setIsTyping(true));
        }
      });

      const stopTypingCleanup = onStopTyping(({ chatId, userId }) => {
        if (chatId === activeChat.id && userId !== currentUser?.id) {
          dispatch(setIsTyping(false));
        }
      });

      // Cleanup function
      return () => {
        messageCleanup();
        typingCleanup();
        stopTypingCleanup();
        dispatch(clearMessages());
        dispatch(setIsTyping(false));
      };
    }
  }, [activeChat, currentUser?.id, dispatch]);

  if (!activeChat || !currentUser) {
    return (
      <div className="flex flex-col flex-1 h-screen bg-white items-center justify-center text-[#4D2D61]">
        Select a conversation to start
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-screen bg-white">
      <ChatHeader user={activeChat} />
      <ChatMessages />
      {isTyping && (
        <div className="px-4 py-2 text-sm text-[#4D2D61]">
          {activeChat.name} is typing...
        </div>
      )}
      <ChatInput chatId={activeChat.id} />
    </div>
  );
}

export default ChatContainer;
