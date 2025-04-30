import "react";
import Routing from "./Routing/Routing";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUserData } from "./features/Slice/userSlice/userSlice";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { ChatProvider } from "./context/chat-context";

function App() {
  return (
    <ChatProvider>
      <div>
        <Routing />
        <Toaster position="top-right" />
      </div>
    </ChatProvider>
  );
}

export default App;
