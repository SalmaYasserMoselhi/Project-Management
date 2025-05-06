import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // استيراد BrowserRouter
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./features/Store/Store.js";
import App from "./App.jsx";
import { ChatProvider } from "./context/chat-context";
import "./utils/axiosConfig.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ChatProvider>
          <App />
        </ChatProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
