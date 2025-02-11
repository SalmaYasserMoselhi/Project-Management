// import  { useState } from "react";

// const Sidebar = () => {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [activeItem, setActiveItem] = useState("Dashboard");

//   const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
//   const handleItemClick = (title) => setActiveItem(title);

//   const sidebarItems = [
//     { icon: 'src/assets/Dashboard.png', title: 'Dashboard' },
//     { icon: 'src/assets/workspace.png', title: 'Workspace', hasAdd: true, hasDropdown: true },
//     { icon: 'src/assets/collabration.png', title: 'Collaboration', hasDropdown: true },
//     { icon: 'src/assets/private.png', title: 'Private', hasAdd: true, hasDropdown: true },
//     { icon: 'src/assets/calender.png', title: 'Calendar' },
//     { icon: 'src/assets/setting.png', title: 'Settings' },
//   ];

//   return (
//     <div
//       className={`relative h-screen bg-white shadow-lg p-4 flex flex-col border-r border-gray-200 font-[Nunito] transition-all duration-300 ${
//         isSidebarOpen ? "w-64" : "w-24"
//       }`}
//       onClick={(e) => {
//         // Toggle sidebar when clicking on empty areas
//         if (e.target === e.currentTarget) {
//           toggleSidebar();
//         }
//       }}
//     >
//       {/* Logo Section */}
//       <div
//         className={`flex items-center gap-2 mb-10 mt-2 overflow-hidden ${
//           isSidebarOpen ? "ml-2" : "justify-center"
//         }`}
//         onClick={(e) => e.stopPropagation()}
//       >
//         <img
//           src="src\assets\mainLogo.png"
//           alt="Logo"
//           className={`h-8 min-w-[32px] transition-transform duration-300 ${
//             !isSidebarOpen && "scale-125"
//           }`}
//         />
//         {isSidebarOpen && <h1 className="text-xl font-bold text-[#4D2D61]">Beehive</h1>}
//       </div>

//       {/* Navigation Items */}
//       <nav className="space-y-2">
//         {sidebarItems.map((item) => (
//           <SidebarItem
//             key={item.title}
//             iconSrc={item.icon}
//             title={item.title}
//             active={activeItem === item.title}
//             isSidebarOpen={isSidebarOpen}
//             hasAddIcon={item.hasAdd}
//             hasDropdown={item.hasDropdown}
//             onClick={(e) => {
//               e.stopPropagation();
//               handleItemClick(item.title);
//             }}
//           />
//         ))}
//       </nav>
//     </div>
//   );
// };

// const SidebarItem = ({ iconSrc, title, active, isSidebarOpen, hasAddIcon, hasDropdown, onClick }) => {
//   return (
//     <div
//       className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
//         active ? "bg-[#4D2D61] text-white" : "text-gray-900 hover:bg-purple-50"
//       } ${isSidebarOpen ? "w-full" : "w-14 justify-center"}`}
//       onClick={onClick}
//     >
//       <div className="flex items-center gap-3">
//         <img
//           src={iconSrc}
//           alt={`${title} icon`}
//           className={`h-6 w-6 ${
//             active ? "filter brightness-0 invert" : "filter brightness-0"
//           }`}
//         />
//         {isSidebarOpen && <span className="text-sm font-medium">{title}</span>}
//       </div>

//       {isSidebarOpen && (hasAddIcon || hasDropdown) && (
//         <div className="flex items-center gap-2 ml-2">
//           {hasAddIcon && (
//             <img
//               src='src\assets\add.png'
//               alt="Add"
//               className={`h-4 w-4 ${active ? "filter brightness-0 invert" : "filter brightness-0"}`}
//             />
//           )}
//           {hasDropdown && (
//             <img
//               src="src\assets\drop-down.png"
//               alt="Dropdown"
//               className={`h-5 w-5 ${active ? "filter brightness-0 invert" : "filter brightness-0"}`}
//             />
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default Sidebar;

import { useState } from "react";
import { useNavigate } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const navigate = useNavigate();

  const sidebarItems = [
    {
      icon: "src/assets/Dashboard.png",
      title: "Dashboard",
      path: "main",
    },
    {
      icon: "src/assets/workspace.png",
      title: "Workspace",
      hasAdd: true,
      hasDropdown: true,
      path: "workspace",
    },
    {
      icon: "src/assets/collabration.png",
      title: "Collaboration",
      hasDropdown: true,
      path: "collaboration",
    },
    {
      icon: "src/assets/private.png",
      title: "Private",
      hasAdd: true,
      hasDropdown: true,
      path: "private",
    },
    { icon: "src/assets/calender.png", title: "Calendar", path: "calendar" },
    { icon: "src/assets/setting.png", title: "Settings", path: "setting" },
  ];

  const handleItemClick = (title, path) => {
    setActiveItem(title);
    navigate(`/dashboard/${path}`);
    // Close sidebar on mobile when clicking items
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 bottom-0 bg-white shadow-lg p-4 flex flex-col border-r border-gray-200  font-[Nunito] transition-all duration-300 z-50 ${
        isSidebarOpen ? "w-64" : "w-24"
      }`}
      onClick={(e) => {
        // Toggle sidebar when clicking on empty areas
        if (e.target === e.currentTarget) {
          toggleSidebar();
        }
      }}
    >
      {/* Logo Section */}
      <div
        className={`flex items-center gap-0.5 mb-10 mt-2 overflow-hidden ${
          isSidebarOpen ? "ml-2" : "justify-center"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          // Toggle on mobile
          if (window.innerWidth < 768) {
            toggleSidebar();
          }
        }}
      >
        <img
          src="src/assets/Logo.png"
          alt="Logo"
          className={`h-9 w-18 min-w-[32px] transition-transform duration-300 ${
            !isSidebarOpen && "scale-125"
          }`}
        />
        {isSidebarOpen && (
          <h1 className="text-2xl text-center font-bold text-[#4D2D61]">
            urora
          </h1>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="space-y-2">
        {sidebarItems.map((item) => (
          <div
            key={item.title}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
              activeItem === item.title
                ? "bg-[#4D2D61] text-white"
                : "text-gray-900 hover:bg-purple-50"
            } ${isSidebarOpen ? "w-full" : "w-14 justify-center"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick(item.title, item.path);
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={item.icon}
                alt={`${item.title} icon`}
                className={`h-6 w-6 ${
                  activeItem === item.title
                    ? "filter brightness-0 invert"
                    : "filter brightness-0"
                }`}
              />
              {isSidebarOpen && (
                <span className="text-sm font-medium">{item.title}</span>
              )}
            </div>

            {isSidebarOpen && (item.hasAdd || item.hasDropdown) && (
              <div className="flex items-center gap-2 ml-2">
                {item.hasAdd && (
                  <img
                    src="src/assets/add.png"
                    alt="Add"
                    className={`h-4 w-4 ${
                      activeItem === item.title
                        ? "filter brightness-0 invert"
                        : "filter brightness-0"
                    }`}
                  />
                )}
                {item.hasDropdown && (
                  <img
                    src="src/assets/drop-down.png"
                    alt="Dropdown"
                    className={`h-5 w-5 ${
                      activeItem === item.title
                        ? "filter brightness-0 invert"
                        : "filter brightness-0"
                    }`}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Mobile Toggle Button */}
      {/* <button
        className="lg:hidden mt-auto p-2 hover:bg-gray-100 rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          toggleSidebar();
        }}
      >
        <div className={`transform transition-transform duration-300 ${
          isSidebarOpen ? "rotate-0" : "rotate-180"
        }`}>
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </div>
      </button> */}
    </div>
  );
};

export default Sidebar;
