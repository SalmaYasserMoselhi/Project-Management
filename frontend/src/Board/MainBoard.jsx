


// const MainBoard = () => {
//   return (
//     <div className="flex">
//       <Sidebar />
//       <div className="flex-1 bg-gray-100 min-h-screen">
//         <Header />
//         <div className="p-6">
//           {/* <ProjectInfo /> */}
//           {/* <Board /> */}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MainBoard;

// In your main layout component
// export default function mainBoard() {
//     return (
//       <div className="min-h-screen">
//         {/* Sidebar */}
//         <div className="fixed left-0 top-0 bottom-0 w-64  text-white z-50">
//           <Sidebar/>
//         </div>
  
//         {/* Header */}
//         <div className="fixed left-64 right-0 top-0 h-16 bg-white shadow-md z-40">
//           <Header/>
//         </div>
  
//         {/* Main Content */}
//         <main className="ml-64 mt-16 p-6">
          
//         </main>
//       </div>
//     );
//   }

import { useState } from 'react';
import '../index.css';
import Header from './Header';
import Sidebar from './Sidebar';

const MainBoard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={handleToggle}
      />
      
      <Header 
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={handleToggle}
      />

      <main className={`transition-all duration-300 ${
        isSidebarOpen ? "md:ml-64" : "md:ml-24"
      } mt-20 p-6 min-h-[calc(100vh-5rem)]`}>
      </main>
    </div>
  );
};

export default MainBoard;