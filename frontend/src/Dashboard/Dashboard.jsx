// import { useEffect, useState } from "react";

// function Dashboard() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchUserData = async () => {
//       try {
//         const response = await fetch("/api/v1/users/me", {
//           method: "GET",
//           credentials: "include",
//           headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//           },
//         });

//         if (!response.ok) {
//           if (response.status === 401) {
//             window.location.href = "/login";
//             return;
//           }
//           const errorData = await response.json();
//           throw new Error(errorData.message || "Failed to fetch user data");
//         }

//         const data = await response.json();
//         if (data.data && data.data.user) {
//           setUser(data.data.user);
//         } else {
//           throw new Error("Invalid user data format");
//         }
//       } catch (error) {
//         console.error("Error in fetchUserData:", error);
//         setError(error.message);

//         if (
//           error.message.includes("logged in") ||
//           error.message.includes("Unauthorized") ||
//           error.message.includes("jwt")
//         ) {
//           window.location.href = "/login";
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUserData();
//   }, []);

//   const handleLogout = async () => {
//     try {
//       const response = await fetch(`/api/v1/users/logout`, {
//         method: "GET",
//         credentials: "include",
//       });

//       if (response.ok) {
//         window.location.href = "/login";
//       } else {
//         throw new Error("Logout failed");
//       }
//     } catch (error) {
//       console.error("Logout error:", error);
//       window.location.href = "/login";
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-xl">Loading...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-red-500">Error: {error}</div>
//       </div>
//     );
//   }

//   if (!user) {
//     return null;
//   }

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Welcome, {user.firstName}!</h1>
//         <button
//           onClick={handleLogout}
//           className="bg-[#4D2D61] text-white px-4 py-2 rounded-lg hover:bg-[#57356A] transition-colors"
//         >
//           Logout
//         </button>
//       </div>

//       <div className="max-w-md mx-auto">
//       <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
//         {/* Header with gradient */}
//         <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600" />

//         {/* Profile Content */}
//         <div className="relative px-6 pb-6">
//           {/* Avatar */}
//           <div className="absolute -top-16 left-6">
//             <div className="relative">
//               <img
//                 src={user.avatar}
//                 alt="Profile"
//                 className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
//               />
//               <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors duration-200">
//                 {/* <Edit2 className="w-4 h-4 text-gray-600" /> */}
//               </button>
//             </div>
//           </div>

//           {/* User Info */}
//           <div className="pt-20">
//             <h2 className="text-2xl font-bold text-gray-800">
//               {user.firstName} {user.lastName}
//             </h2>

//             <div className="mt-6 space-y-4">
//               <div className="flex items-center text-gray-600">
//                 {/* <Mail className="w-5 h-5 mr-3" /> */}
//                 <span>{user.email}</span>
//               </div>

//               <div className="flex items-center text-gray-600">
//                 {/* <AtSign className="w-5 h-5 mr-3" /> */}
//                 <span>{user.username}</span>
//               </div>
//             </div>

//             {/* Action Buttons */}
//             <div className="mt-8 flex gap-4">
//               <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200">
//                 Edit Profile
//               </button>
//               <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200">
//                 View Activity
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//     </div>
//   );
// }

// export default Dashboard;

import { useState } from "react";
import "../index.css";
import Header from "../Components/Header";
import Sidebar from "../Components/Sidebar";
import { Outlet } from "react-router-dom";

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex w-[185vh]">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={handleToggle} />

      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={handleToggle} />
      <main
        className={`w-full transition-all duration-300  ${
          isSidebarOpen ? "md:ml-28 mr:0 p-6" : "md:ml-0.3 pr-6 pt-6 w-[90%]"
        } mt-18 min-h-[calc(100vh-5rem)]`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;
