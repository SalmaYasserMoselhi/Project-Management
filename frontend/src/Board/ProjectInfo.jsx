
import { useState } from "react";
import CalendarBlank from "../assets/CalendarBlank.png";
import edit from "../assets/edit.png";
import share from "../assets/share.png";
import vector from "../assets/Vector.png";
import { useSelector } from "react-redux";
import ShareModal from "./ShareModal"; // import the modal

const ProjectInfo = ({ boardName, boardDescription }) => {
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-sm mb-2 mt-7 transition-all duration-300`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {boardName || "Project Name"}
            <img
              src={edit}
              alt="Edit"
              className="w-4 h-4 cursor-pointer ms-2"
            />
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <img src={CalendarBlank} alt="Clock" className="w-4 h-4" /> 20 July
          </p>
        </div>

        <div className="flex items-center gap-5 mt-4 md:mt-0 ms-auto">
          <div className="flex items-center gap-2 cursor-pointer" >
            <img
              src={share}
              alt="Share"
              className="w-8 h-8 rounded-full border-2 border-white"
              onClick={() => setShowShareModal(true)}
            />
            <img src={vector} alt="Vector" className="w-5 h-1" />
          </div>
        </div>
      </div>

      <p className="text-gray-600 mt-4">{boardDescription || null}</p>

      {/* Share Modal */}
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
};

export default ProjectInfo;
