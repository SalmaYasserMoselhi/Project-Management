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
