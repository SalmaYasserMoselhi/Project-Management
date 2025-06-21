import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, MessageCircle, Users } from "lucide-react";

const ChatWelcomeScreen = memo(({ isMobile, onBackClick }) => {
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* زر الرجوع للموبايل عندما لا توجد محادثة نشطة */}
      {isMobile && onBackClick && (
        <div className="p-4 border-b border-gray-200/60">
          <button
            onClick={onBackClick}
            className="flex items-center gap-3 text-[#4d2d61] hover:text-[#7b4397]transition-colors duration-300 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Conversations</span>
          </button>
        </div>
      )}

      {/* شاشة الترحيب */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-md mx-auto"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative mb-6"
          >
            <div className="w-26 h-26 mx-auto bg-gradient-to-br from-[#4d2d61]/10 to-[#7b4397]/10 rounded-full flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4d2d61]/5 to-[#7b4397]/5 animate-pulse"></div>
              <MessageCircle className="w-12 h-12 text-[#4d2d61] relative z-10" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 20,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute inset-2 border-2 border-dashed border-[#4d2d61]/20 rounded-full"
              ></motion.div>
            </div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-2 right-2"
            >
              <Sparkles className="w-6 h-6 text-[#7b4397]" />
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-[28px] font-bold bg-gradient-to-r from-[#4d2d61] to-[#7b4397] bg-clip-text text-transparent mb-4"
          >
            Welcome to Nexus Chat
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-gray-600 text-md mb-8 leading-relaxed"
          >
            Select a conversation from the sidebar to start chatting, or create
            a new conversation to connect with your team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-time messaging</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4d2d61]" />
                <span>Group conversations</span>
              </div>
            </div>

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 rounded-full text-[#4D2D61] font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Start your first conversation</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
});

ChatWelcomeScreen.displayName = "ChatWelcomeScreen";

export default ChatWelcomeScreen;
