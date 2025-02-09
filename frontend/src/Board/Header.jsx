

import { FaBell, FaChevronDown, FaSearch, FaBars } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";

const Header = ( {isSidebarOpen, toggleSidebar} ) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationCount] = useState(3);
  const dropdownRef = useRef(null);
 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className={`bg-white border-b border-gray-100 fixed top-0 h-20 z-40 shadow-sm font-[Nunito] transition-all duration-300 ${
      isSidebarOpen ? "left-64" : "left-24"
    } right-0`}>
      <div className="h-full px-6">
        <div className="flex justify-between h-full items-center">
          {/* Left Section */}
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden mr-4 p-2 hover:bg-gray-50 rounded-lg"
            >
              <FaBars className="h-6 w-6 text-gray-600" />
            </button>
            
            {/* Search Input */}
            <div className="flex-1 max-w-4xl ">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
                  <FaSearch className="text-gray-500 h-[15px] w-[15px]" />
                </div>
                <input
                  type="text"
                  placeholder="Search across workspace..."
                  className="w-[500px]  pl-12 pr-6 py-3 text-[15px] border-2 border-gray-100 rounded-xl focus:border-[#897098] focus:ring-0 outline-none transition-all placeholder-gray-400 bg-gray-50 hover:bg-white"
                  aria-label="Search"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                  ⌘K
                </div>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="ml-6 flex items-center space-x-6">
            {/* Notification */}
            <button 
              className="relative p-2 hover:bg-gray-50 rounded-lg transition-all"
              aria-label="Notifications"
            >
              <div className="relative">
                <FaBell className="h-6 w-6 text-gray-600" />
                {notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {notificationCount}
                  </span>
                )}
              </div>
            </button>

            {/* Profile Section */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 group hover:bg-gray-50 px-3 py-2 rounded-xl transition-all"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <div className="relative">
                  <img
                    src="https://randomuser.me/api/portraits/men/1.jpg"
                    alt="User profile"
                    className="h-10 w-10 rounded-3xl object-cover border-2 border-white shadow-md"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/40';
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-800">FatmaEmad</span>
                  <span className="text-xs text-gray-500 mt-[2px]">Administrator</span>
                </div>
                <FaChevronDown className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-3 w-64 rounded-lg shadow-lg bg-white ring-1 ring-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {/* ... (keep your existing dropdown code) ... */}

                  <div className="py-2">
      <a href="#profile" className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100 gap-2 transition-colors">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profile Settings
       </a>
       <a href="#security" className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100 gap-2 transition-colors">
         <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Security
       </a>
       <a href="#team" className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100 gap-2 transition-colors">
         <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
         </svg>
         Team Members
       </a>
    </div>

     {/* Logout */}
    <div className="py-2 bg-gray-50">
       <button className="w-full flex items-center px-5 py-2.5 text-sm text-red-600 hover:bg-red-100 gap-2 transition-colors">
         <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
         Log Out
      </button>
    </div>
   </div>
                
)}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;

