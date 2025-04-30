import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchConversations } from "../features/Slice/ChatSlice/chatSlice";
import ChatList from "./ChatList";
import ChatContainer from "./ChatContainer";

function ChatLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-none">
        <ChatList />
      </div>
      <div className="flex-1 relative">
        <ChatContainer />
      </div>
    </div>
  );
}

export default ChatLayout;
