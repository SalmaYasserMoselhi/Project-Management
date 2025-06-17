"use client";

import { useState, useEffect } from "react";
import { useChat } from "../context/chat-context";
import ChatList from "./ChatList";
import ChatContainer from "./ChatContainer";
import { motion, AnimatePresence } from "framer-motion";

function ChatLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const { activeConversation } = useChat();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleChatSelect = () => {
    if (isMobile) {
      setShowChatList(false);
    }
  };

  useEffect(() => {
    if (!isMobile) {
      setShowChatList(true);
    }
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {!isMobile ? (
        <>
          <div className="flex-none w-100 border-r border-gray-200">
            <ChatList onChatSelect={handleChatSelect} />
          </div>

          <div className="flex-1 relative">
            <ChatContainer />
          </div>
        </>
      ) : (
        <div className="w-full h-full relative">
          <AnimatePresence mode="wait">
            {showChatList ? (
              <motion.div
                key="chat-list"
                className="absolute inset-0 w-full h-full"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ChatList onChatSelect={handleChatSelect} />
              </motion.div>
            ) : (
              <motion.div
                key="chat-container"
                className="absolute inset-0 w-full h-full"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ChatContainer
                  onBackClick={() => setShowChatList(true)}
                  isMobile={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default ChatLayout;
