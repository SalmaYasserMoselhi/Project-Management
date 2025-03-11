

import { useState } from "react";
import "../index.css";
import Header from "../Components/Header";
import Sidebar from "../Components/Sidebar";
import ProjectInfo from "./ProjectInfo";
import Board from "./Board"

const MainBoard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
 
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex w-[195vh] ">
       <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={handleToggle}
      /> 
       
      <Header 
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={handleToggle}
      />
 
 <main
  className={`w-[80vw] transition-all duration-300  ${
    isSidebarOpen ? "md:ml-40" : "md:ml-3  w-[90vw]"
  } mt-18 p-6 min-h-[calc(90vh-5rem)]`}
>
  <ProjectInfo />
  <Board/>
</main>
    </div>
  );
};

export default MainBoard;



