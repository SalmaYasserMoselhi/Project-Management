import ChatList from "./ChatList";
import ChatContainer from "./ChatContainer";

function ChatLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <ChatList />
      <ChatContainer />
    </div>
  );
}

export default ChatLayout;
