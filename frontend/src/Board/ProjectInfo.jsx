import { useState, useRef, useEffect } from "react";
import CalendarBlank from "../assets/CalendarBlank.png";
import edit from "../assets/edit.png";
import share from "../assets/share.png";
import vector from "../assets/Vector.png";
import { useSelector } from "react-redux";
import ShareModal from "./ShareModal";
import ArchivedPopup from "./ArchivedPopup";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ProjectInfo = ({ boardName, boardDescription, boardId }) => {
  const BASE_URL = "http://localhost:3000";
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const [showToast, setShowToast] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showArchivedPopup, setShowArchivedPopup] = useState(false);
  const navigate = useNavigate();

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleArchivedClick = () => {
    setShowArchivedPopup(true);
    setShowDropdown(false);
  };

  const handleDeleteBoard = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this board?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${BASE_URL}/api/v1/boards/user-boards/${boardId}`, {
        withCredentials: true,
      });
      navigate("/main/dashboard");
      setShowToast(true);
      setShowDropdown(false); // Optional: hide dropdown after deletion

      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error deleting board:", error);
      alert("Failed to delete board.");
    }
  };

  {
    showToast && (
      <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md z-50">
        Board has been deleted successfully!
      </div>
    );
  }
  return (
    <>
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md z-50">
          Board has been deleted successfully!
        </div>
      )}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-2 mt-7 transition-all duration-300">
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
              <img src={CalendarBlank} alt="Clock" className="w-4 h-4" /> 20
              July
            </p>
          </div>

          <div
            className="flex items-center gap-5 mt-4 md:mt-0 ms-auto relative"
            ref={dropdownRef}
          >
            {/* Share icon */}
            <div className="flex items-center gap-2 cursor-pointer">
              <img
                src={share}
                alt="Share"
                className="w-8 h-8 rounded-full border-2 border-white"
                onClick={() => setShowShareModal(true)}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 18 24"
                onClick={() => setShowDropdown((prev) => !prev)}
                className="cursor-pointer"
              >
                <path
                  fill="none"
                  stroke="#4D2D61"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
                />
              </svg>
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-12 right-0 bg-white border rounded-md shadow-lg w-48 z-10 border-white">
                <ul className="text-sm text-gray-700 ">
                  <li
                    onClick={handleArchivedClick}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Archived
                  </li>
                  <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                    Settings
                  </li>
                  <li
                    onClick={handleDeleteBoard}
                    className="px-4 py-2 hover:bg-red-100 text-red-600 cursor-pointer"
                  >
                    Delete
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-600 mt-4">{boardDescription || null}</p>

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          boardId={boardId}
        />

        {/* Archived Popup */}
        {showArchivedPopup && (
          <ArchivedPopup onClose={() => setShowArchivedPopup(false)} />
        )}
      </div>
    </>
  );
};

export default ProjectInfo;
