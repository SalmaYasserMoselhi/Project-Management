

// import { useState } from "react";
// import "../index.css";
// import Sidebar from "../Components/Sidebar";
// import ProjectInfo from "./ProjectInfo";
// import Board from "./Board";

// const MainBoard = () => {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

//   const handleToggle = () => {
//     setIsSidebarOpen(!isSidebarOpen);
//   };

//   return (
//     <div className="min-h-screen bg-[#f5f5f5] flex flex-col md:flex-row w-full">
//       <Sidebar 
//         isSidebarOpen={isSidebarOpen} 
//         toggleSidebar={handleToggle}
//       /> 

//       <main
//   className={`flex-1 transition-all duration-300 ${
//     isSidebarOpen ? "md:ml-62" : "md:ml-20"
//   }  p-6 overflow-y-auto`}
//   style={{ maxHeight: '100vh' }} 
//       >


//         <ProjectInfo />
//         <Board />
//       </main>
//     </div>
//   );
// };

// export default MainBoard;

//  import { useState } from "react";
//  import "../index.css";
//  import Sidebar from "../Components/Sidebar";
//  import ProjectInfo from "./ProjectInfo";
//  import Board from "./Board";

//  const MainBoard = () => {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

//   return (
//     <div className="min-h-screen bg-[#f5f5f5] flex">
//       {/* Sidebar Container */}
//       <div className={` transition-all duration-300`}>
//         <Sidebar 
//           isSidebarOpen={isSidebarOpen} 
//           toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
//         />
//       </div>

//       {/* Main Content */}
//        {/* <main
//         className={`flex-1 transition-all duration-300 ${
//           isSidebarOpen ? "ml-2" : "ml-5"  // Changed from md:ml-* to ml-*
//         } p-6 h-screen overflow-y-auto`}
//       > */}
//        <main
//     className={`flex-1 transition-all duration-300 p-6 h-screen overflow-y-auto ${
//       isSidebarOpen ? "ml-56" : "ml-12"
//     }`}
//   >
//         <ProjectInfo />
//         <Board />
//       </main>
//     </div>
//   );
// };

// export default MainBoard;

// import { useState } from "react";
// import Sidebar from "../Components/Sidebar";
// import ProjectInfo from "./ProjectInfo";
// import Board from "./Board";

// const MainBoard = () => {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

//   return (
//     // <div className="min-h-screen bg-[#f5f5f5] flex  border-2 border-red-500">
//       <div className={` min-h-screen bg-[#f5f5f5] flex  border-2 border-red-500`}>
//       {/* Sidebar Container */}
//       <div className={` transition-all duration-300`}>
//         <Sidebar 
//           isSidebarOpen={isSidebarOpen} 
//           toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
//         />
//       </div>

      
//       <main className={`${isSidebarOpen ? "w-20" : "w-20"} flex-1 border-2 border-red-500 transition-all duration-300  p-6 h-screen overflow-y-auto`}>
//         <ProjectInfo />
//         <Board />
//       </main>
//     </div>
//   );
// };

// export default MainBoard;
// import { useState } from "react";
// import Sidebar from "../Components/Sidebar";
// import ProjectInfo from "./ProjectInfo";
// import Board from "./Board";

// const MainBoard = () => {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

//   return (
//     <div className="min-h-screen flex bg-[#f5f5f5]">
//       {/* Sidebar Container */}
//       <div    
//       >
//         <Sidebar
//           isSidebarOpen={isSidebarOpen}
//           toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
//         />
//       </div>

//       {/* Main Content */}
//       {/* <div className="flex-1 h-screen overflow-y-auto p-3 transition-all duration-300 overflow-x-auto"> */}
//       <div className="flex-1 h-screen overflow-y-auto p-3 transition-all duration-300 overflow-x-hidden border-2 border-red-500">

//         <ProjectInfo />
//         <Board />
//       </div>
//     </div>
//   );
// };

// export default MainBoard;


import { useState } from "react";
import Sidebar from "../Components/Sidebar";
import ProjectInfo from "./ProjectInfo";
import Board from "./Board";

const MainBoard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const sidebarWidth = isSidebarOpen ? 20: 20;

  return (
    <div className="min-h-screen flex bg-[#f5f5f5] overflow-hidden">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }}>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden p-3 transition-all duration-300">
      <ProjectInfo isSidebarOpen={isSidebarOpen} />
        <Board isSidebarOpen={isSidebarOpen} />
      </div>
    </div>
  );
};

export default MainBoard;
