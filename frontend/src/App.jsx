import "react";
import Routing from "./Routing/Routing";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUserData } from "./features/Slice/userSlice/userSlice";
import "./index.css";

function App() {
  return (
    <div className="w-full h-screen overflow-hidden">
      <Routing />
    </div>
  );
}

export default App;
