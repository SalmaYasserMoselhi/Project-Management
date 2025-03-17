// import { Bell, Search } from "lucide-react";
// import Logo from "../assets/LogoF.png";
// import SmallLogo from "../assets/Logo.png";
// import Avatar from "../assets/defaultAvatar.png";
// import { useEffect, useState } from "react";

// const Header = () => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

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

//   return (
//     <header className="w-full bg-white shadow-md px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
//       {/*Logo*/}
//       <div className="flex items-center flex-shrink-0">
//         <img
//           src={Logo}
//           alt="Aurora Logo"
//           className="h-10 sm:h-12 md:h-14 hidden md:block"
//         />
//         <img
//           src={SmallLogo}
//           alt="Aurora Mobile Logo"
//           className="h-10 block md:hidden"
//         />
//       </div>

//       {/*Search bar */}
//       <div className="flex-grow mx-2 sm:mx-4 lg:mx-8 xl:mx-12 max-w-2xl lg:max-w-4xl xl:max-w-5xl w-full lg:w-[85%] xl:w-[90%]">
//         <div className="flex items-center bg-gray-50 px-3 sm:px-4 py-1 sm:py-2 rounded-xl shadow-sm w-full h-10 sm:h-12 focus-within:ring-1 focus-within:ring-gray-500 transition duration-200">
//           <Search className="text-gray-300 w-5 sm:w-6 h-5 sm:h-6 mr-2 sm:mr-3" />
//           <input
//             type="text"
//             placeholder="Search something here..."
//             className="w-full bg-transparent focus:outline-none text-sm sm:text-base text-gray-400 placeholder-gray-400"
//             aria-label="Search bar"
//             autoFocus
//           />
//         </div>
//       </div>

//       {/*Notifications icon + user image*/}
//       <div className="flex items-center space-x-4 sm:space-x-6 flex-shrink-0">
//         {/* Notifications icon  */}
//         <div className="relative cursor-pointer">
//           <Bell
//             size={24}
//             fill="#212121"
//             className="w-5 sm:w-6 h-5 sm:h-6 text-gray-800"
//           />
//           <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
//         </div>

//         {/*user data */}
//         {loading ? (
//           <div className="animate-pulse w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full"></div>
//         ) : user ? (
//           <div className="flex items-center space-x-2 sm:space-x-3">
//             <div className="hidden sm:block text-right">
//               <p className="text-xs sm:text-sm font-medium text-gray-800">
//                 {user.firstName} {user.lastName}
//               </p>
//               <p className="text-xs text-gray-500">{user.email}</p>
//             </div>
//             <img
//               src={
//                 user.avatar && user.avatar !== "default.jpg"
//                   ? user.avatar
//                   : Avatar
//               }
//               alt="User Avatar"
//               onError={(e) => (e.target.src = Avatar)}
//               className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-gray-600"
//             />
//           </div>
//         ) : (
//           <div className="flex items-center">
//             <p className="text-sm font-medium text-gray-800">Guest</p>
//           </div>
//         )}
//       </div>
//     </header>
//   );
// };

// export default Header;
