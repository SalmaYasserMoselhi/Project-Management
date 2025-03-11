import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import Sidebar from "../Components/Sidebar";

const Main = () => {
  const { isSidebarOpen } = useSelector((state) => state.sidebar);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content with spacing */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-24"
        }`}
      >
        <div className="p-3 h-full overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Main;
