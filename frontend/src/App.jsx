// import "react";
// import Routing from "./Routing/Routing";
// import "./index.css";

// function App() {
//   return (
//     <div className="w-full h-screen overflow-hidden">
//       <Routing />
//     </div>
//   );
// }

// export default App;


import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import Routing from "./Routing/Routing";
<<<<<<< HEAD
import WorkspacePopup from "./Workspace/WorkspacePopup";
import Sidebar from "./Components/Sidebar";
=======
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUserData } from "./features/Slice/userSlice/userSlice";
>>>>>>> aa7d3aa530b1bf0862019481f670b81f27aae275
import "./index.css";

function App() {
  const { isWorkspaceOpen } = useSelector((state) => state.sidebar);
  const location = useLocation();

  // List of auth pages where we don't want Sidebar and WorkspacePopup
  const authPages = ["/Login", "/signup", "/forgetpassword","/verification","/ResetPassword"];

  // Check if current page is auth
  const isAuthPage = authPages.includes(location.pathname);

  return (
    <div className="w-full h-screen overflow-hidden flex">
      {/* Show Sidebar and WorkspacePopup only if NOT on auth page */}
      {!isAuthPage && <Sidebar />}
      {!isAuthPage && isWorkspaceOpen && <WorkspacePopup />}

      <div className="flex-1 overflow-auto">
        <Routing />
      </div>
    </div>
  );
}

export default App;

