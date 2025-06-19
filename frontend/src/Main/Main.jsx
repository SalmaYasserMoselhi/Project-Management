import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice";
import Header from "../Components/Header";

const Main = () => {
  const { isSidebarOpen } = useSelector((state) => state.sidebar);
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-x-scroll ">
      {/* Mobile overlay with blur effect */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 backdrop-blur-[0.75px] bg-white/10 z-40  "
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      {/* Sidebar  */}
      <Sidebar />

      {/* Main  */}
      <div
        className={`flex-1 transition-all duration-300 pb-0 ${
          !isMobile && isSidebarOpen ? "ml-60" : !isMobile ? "ml-20" : "ml-0"
        }`}
      >
        <Header />

        <div className="h-full overflow-auto no-scrollbar">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Main;
