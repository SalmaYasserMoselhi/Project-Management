

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

 import { useState } from "react";
 import "../index.css";
 import Sidebar from "../Components/Sidebar";
 import ProjectInfo from "./ProjectInfo";
 import Board from "./Board";

 const MainBoard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Sidebar Container */}
      <div className={`${isSidebarOpen ? "w-55" : "w-40"} transition-all duration-300`}>
        <Sidebar 
          isSidebarOpen={isSidebarOpen} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
      </div>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-2" : "ml-40"  // Changed from md:ml-* to ml-*
        } p-6 h-screen overflow-y-auto`}
      >
        <ProjectInfo />
        <Board />
      </main>
    </div>
  );
};

export default MainBoard;