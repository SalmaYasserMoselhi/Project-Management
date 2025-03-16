// import { useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";

// import {
//   toggleSidebar,
//   setActiveItem,
//   toggleWorkspaceOpen,
// } from "../features/Slice/ComponentSlice/sidebarSlice";
// import { fetchUserData } from "../features/Slice/userSlice/userSlice";

// import DashboardIcon from "../assets/Dashboard.png";
// import WorkspaceIcon from "../assets/workspaces2.png";
// import CollaborationIcon from "../assets/collabration.png";
// import PrivateIcon from "../assets/private.png";
// import chatIcon from "../assets/chat.png";
// import notificationIcon from "../assets/notification.png";
// import Avatar from "../assets/defaultAvatar.png";
// import LogoF from "../assets/LogoF.png";

// import {
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
//   ChevronsUpDown,
//   Plus,
// } from "lucide-react";

// const Sidebar = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   // Get state from Redux store
//   const { isSidebarOpen, activeItem, isWorkspaceOpen } = useSelector(
//     (state) => state.sidebar
//   );
//   const { user } = useSelector((state) => state.user);

//   useEffect(() => {
//     dispatch(fetchUserData());
//   }, [dispatch]);

//   const sidebarItems = [
//     {
//       icon: DashboardIcon,
//       title: "Dashboard",
//       path: "dashboard",
//     },
//     {
//       icon: WorkspaceIcon,
//       title: "Workspace",
//       hasAdd: true,
//       hasDropdown: true,
//       path: "workspace",
//     },
//     {
//       icon: CollaborationIcon,
//       title: "Collaboration",
//       hasDropdown: true,
//       path: "collaboration",
//     },
//     {
//       icon: PrivateIcon,
//       title: "Private",
//       hasAdd: true,
//       hasDropdown: true,
//       path: "private",
//     },
//   ];

//   const handleItemClick = (title, path) => {
//     dispatch(setActiveItem(title));
//     navigate(`/main/${path}`);

//     if (window.innerWidth < 768) {
//       dispatch(toggleSidebar());
//     }
//   };

//   return (
//     <div
//       className={`fixed left-0 top-0 bottom-0 bg-[#4D2D61] shadow-lg p-4 flex flex-col border-r border-gray-200 font-[Nunito] transition-all duration-300 z-50 ${
//         isSidebarOpen ? "w-60" : "w-24"
//       }`}
//     >
//       {/* Logo and Close Button Section */}
//       <div className="relative flex items-center w-full mb-6 mt-2">
//         {isSidebarOpen && (
//           <img
//             src={LogoF || "/placeholder.svg"}
//             alt="Logo"
//             className="h-12 transition-all duration-300"
//           />
//         )}
//         <button
//           onClick={() => dispatch(toggleSidebar())}
//           className={`flex items-center justify-center w-8 h-8 rounded-full bg-[#57356A] text-white transition-all duration-300 shadow-lg ${
//             isSidebarOpen
//               ? "ml-auto hover:bg-[#57356A]"
//               : "mx-auto hover:bg-[#57356A]"
//           }`}
//         >
//           {isSidebarOpen ? (
//             <ChevronLeft size={24} />
//           ) : (
//             <ChevronRight size={24} />
//           )}
//         </button>
//       </div>

//       <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />

//       {/* Only render the user workspace section if user data is available */}
//       {user && (
//         <div className="mb-4">
//           {isSidebarOpen ? (
//             <div
//               className="flex items-center justify-between cursor-pointer px-2 py-1 rounded-md hover:bg-[#6A3B82]"
//               onClick={() => dispatch(toggleWorkspaceOpen())}
//             >
//               <div className="w-6 h-6 flex items-center justify-center bg-white text-[#4D2D61] font-bold rounded-sm text-sm">
//                 {user.firstName.charAt(0).toUpperCase()}
//               </div>

//               <span className="text-sm font-medium flex-1 px-2 truncate text-white">
//                 {user.firstName}&apos;s Workspaces
//               </span>

//               <ChevronsUpDown
//                 className="h-5 w-5 text-white transition-transform duration-200"
//                 style={{
//                   transform: isWorkspaceOpen
//                     ? "rotate(180deg)"
//                     : "rotate(0deg)",
//                 }}
//               />
//             </div>
//           ) : (
//             <div className="flex justify-center">
//               <div className="w-12 h-12 flex items-center justify-center bg-[#6A3B82] text-white font-bold rounded-xl text-sm">
//                 {user.firstName.charAt(0).toUpperCase()}
//               </div>
//             </div>
//           )}

//           {/* Dropdown menu */}
//           {isSidebarOpen && isWorkspaceOpen && (
//             <div className="mt-2 space-y-2 pl-3">
//               {/* Notifications */}
//               <div className="flex items-center space-x-2 cursor-pointer py-1 text-white hover:text-gray-300">
//                 <img
//                   src={notificationIcon || "/placeholder.svg"}
//                   alt="Notifications"
//                   className="h-5 w-5"
//                 />
//                 <span className="text-sm">Notifications</span>
//               </div>

//               {/* Chat */}
//               <div className="flex items-center space-x-2 cursor-pointer py-1 text-white hover:text-gray-300">
//                 <img
//                   src={chatIcon || "/placeholder.svg"}
//                   alt="Chat"
//                   className="h-5 w-5"
//                 />
//                 <span className="text-sm">Chat</span>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />
//       {/* Navigation Items */}
//       <nav className="space-y-2">
//         {sidebarItems.map((item) => (
//           <div
//             key={item.title}
//             className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
//               activeItem === item.title
//                 ? "bg-[#4D2D61] text-white"
//                 : "text-gray-900 hover:bg-[#6A3B82]"
//             } ${isSidebarOpen ? "w-full" : "w-14 justify-center"}`}
//             onClick={(e) => {
//               e.preventDefault();
//               handleItemClick(item.title, item.path);
//             }}
//           >
//             <div className="flex items-center gap-3">
//               <img
//                 src={item.icon || "/placeholder.svg"}
//                 alt={`${item.title} icon`}
//                 className={`h-6 w-6 filter brightness-0 invert ${
//                   activeItem === item.title
//                     ? "filter brightness-0 invert"
//                     : "filter brightness-0"
//                 }`}
//               />
//               {isSidebarOpen && (
//                 <span className="text-sm font-medium text-white">
//                   {item.title}
//                 </span>
//               )}
//             </div>

//             {isSidebarOpen && (item.hasAdd || item.hasDropdown) && (
//               <div className="flex items-center gap-2 ml-2">
//                 {item.hasAdd && <Plus className="h-4 w-4 text-white" />}
//                 {item.hasDropdown && (
//                   <ChevronDown className="h-5 w-5 text-white" />
//                 )}
//               </div>
//             )}
//           </div>
//         ))}
//       </nav>

//       <div className="mt-auto">
//         <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />
//         {user && (
//           <div
//             className={`flex items-center p-3 rounded-2xl bg-[#6A3B82] text-white transition-all duration-300 ${
//               isSidebarOpen
//                 ? "w-full flex-row"
//                 : "w-12 h-12 flex-col justify-center"
//             }`}
//           >
//             <img
//               src={
//                 user?.avatar && user.avatar !== "default.jpg"
//                   ? user.avatar
//                   : Avatar
//               }
//               alt="User Avatar"
//               onError={(e) => (e.target.src = Avatar)}
//               className={`rounded-full border-gray-600 transition-all duration-300 ${
//                 isSidebarOpen
//                   ? "w-8 h-8 sm:w-10 sm:h-10"
//                   : "w-6 h-6 sm:w-8 sm:h-8"
//               }`}
//             />

//             {isSidebarOpen && (
//               <div className="ml-3 overflow-hidden">
//                 <p className="text-xs sm:text-sm font-medium text-white truncate">
//                   {user.firstName} {user.lastName}
//                 </p>
//                 <p className="text-xs text-gray-300 truncate">{user.email}</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Sidebar;


import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  toggleSidebar,
  setActiveItem,
  toggleWorkspaceOpen,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";

import DashboardIcon from "../assets/Dashboard.png";
import WorkspaceIcon from "../assets/workspaces2.png";
import CollaborationIcon from "../assets/collabration.png";
import PrivateIcon from "../assets/private.png";
import chatIcon from "../assets/chat.png";
import notificationIcon from "../assets/notification.png";
import Avatar from "../assets/defaultAvatar.png";
import LogoF from "../assets/LogoF.png";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Plus,
} from "lucide-react";

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get state from Redux store
  const { activeItem, isWorkspaceOpen } = useSelector(
    (state) => state.sidebar
  );
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchUserData());
  }, [dispatch]);

  const sidebarItems = [
    {
      icon: DashboardIcon,
      title: "Dashboard",
      path: "dashboard",
    },
    {
      icon: WorkspaceIcon,
      title: "Workspace",
      hasAdd: true,
      hasDropdown: true,
      path: "workspace",
    },
    {
      icon: CollaborationIcon,
      title: "Collaboration",
      hasDropdown: true,
      path: "collaboration",
    },
    {
      icon: PrivateIcon,
      title: "Private",
      hasAdd: true,
      hasDropdown: true,
      path: "private",
    },
  ];

  const handleItemClick = (title, path) => {
    dispatch(setActiveItem(title));
    navigate(`/main/${path}`);

    if (window.innerWidth < 768) {
      dispatch(toggleSidebar());
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 bottom-0 bg-[#4D2D61] shadow-lg p-4 flex flex-col border-r border-gray-200 font-[Nunito] transition-all duration-300 z-50 ${
        isSidebarOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Logo and Close Button Section */}
      <div className="relative flex items-center w-full mb-6 mt-2">
        {isSidebarOpen && (
          <img
            src={LogoF || "/placeholder.svg"}
            alt="Logo"
            className="h-12 transition-all duration-300"
          />
        )}
        <button
          onClick={toggleSidebar}
          className={`flex items-center justify-center w-8 h-8 rounded-full bg-[#57356A] text-white transition-all duration-300 shadow-lg ${
            isSidebarOpen
              ? "ml-auto hover:bg-[#57356A]"
              : "mx-auto hover:bg-[#57356A]"
          }`}
        >
          {isSidebarOpen ? (
            <ChevronLeft size={24} />
          ) : (
            <ChevronRight size={24} />
          )}
        </button>
      </div>

      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />

      {/* Only render the user workspace section if user data is available */}
      {user && (
        <div className="mb-4">
          {isSidebarOpen ? (
            <div
              className="flex items-center justify-between cursor-pointer px-2 py-1 rounded-md hover:bg-[#6A3B82]"
              onClick={() => dispatch(toggleWorkspaceOpen())}
            >
              <div className="w-6 h-6 flex items-center justify-center bg-white text-[#4D2D61] font-bold rounded-sm text-sm">
                {user.firstName.charAt(0).toUpperCase()}
              </div>

              <span className="text-sm font-medium flex-1 px-2 truncate text-white">
                {user.firstName}&apos;s Workspaces
              </span>

              <ChevronsUpDown
                className="h-5 w-5 text-white transition-transform duration-200"
                style={{
                  transform: isWorkspaceOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[#6A3B82] text-white font-bold rounded-xl text-sm">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Dropdown menu */}
          {isSidebarOpen && isWorkspaceOpen && (
            <div className="mt-2 space-y-2 pl-3">
              {/* Notifications */}
              <div className="flex items-center space-x-2 cursor-pointer py-1 text-white hover:text-gray-300">
                <img
                  src={notificationIcon || "/placeholder.svg"}
                  alt="Notifications"
                  className="h-5 w-5"
                />
                <span className="text-sm">Notifications</span>
              </div>

              {/* Chat */}
              <div className="flex items-center space-x-2 cursor-pointer py-1 text-white hover:text-gray-300">
                <img
                  src={chatIcon || "/placeholder.svg"}
                  alt="Chat"
                  className="h-5 w-5"
                />
                <span className="text-sm">Chat</span>
              </div>
            </div>
          )}
        </div>
      )}

      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />
      {/* Navigation Items */}
      <nav className="space-y-2">
        {sidebarItems.map((item) => (
          <div
            key={item.title}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
              activeItem === item.title
                ? "bg-[#4D2D61] text-white"
                : "text-gray-900 hover:bg-[#6A3B82]"
            } ${isSidebarOpen ? "w-full" : "w-14 justify-center"}`}
            onClick={(e) => {
              e.preventDefault();
              handleItemClick(item.title, item.path);
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={item.icon || "/placeholder.svg"}
                alt={`${item.title} icon`}
                className={`h-6 w-6 filter brightness-0 invert ${
                  activeItem === item.title
                    ? "filter brightness-0 invert"
                    : "filter brightness-0"
                }`}
              />
              {isSidebarOpen && (
                <span className="text-sm font-medium text-white">
                  {item.title}
                </span>
              )}
            </div>

            {isSidebarOpen && (item.hasAdd || item.hasDropdown) && (
              <div className="flex items-center gap-2 ml-2">
                {item.hasAdd && <Plus className="h-4 w-4 text-white" />}
                {item.hasDropdown && (
                  <ChevronDown className="h-5 w-5 text-white" />
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto">
        <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />
        {user && (
          <div
            className={`flex items-center p-3 rounded-2xl bg-[#6A3B82] text-white transition-all duration-300 ${
              isSidebarOpen
                ? "w-full flex-row"
                : "w-12 h-12 flex-col justify-center"
            }`}
          >
            <img
              src={
                user?.avatar && user.avatar !== "default.jpg"
                  ? user.avatar
                  : Avatar
              }
              alt="User Avatar"
              onError={(e) => (e.target.src = Avatar)}
              className={`rounded-full border-gray-600 transition-all duration-300 ${
                isSidebarOpen
                  ? "w-8 h-8 sm:w-10 sm:h-10"
                  : "w-6 h-6 sm:w-8 sm:h-8"
              }`}
            />

            {isSidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-300 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;