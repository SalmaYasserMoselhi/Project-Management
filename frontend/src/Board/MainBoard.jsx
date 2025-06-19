import { useParams, useLocation } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import ProjectInfo from "./ProjectInfo";
import Board from "./Board";
import NotificationPopup from "./NotificationPopup";
import { useEffect, useRef, useState } from "react";
import profile from "../assets/profile.png";
import notifyIcon from "../assets/notify.png";

const MainBoard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { workspaceId, boardId } = useParams();
  const [restoredLists, setRestoredLists] = useState([]);
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const cardId = searchParams.get("cardId");

  const handleListRestored = (restoredList) => {
    setRestoredLists((prev) => [...prev, restoredList]);
  };

  // Fetch board info
  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/v1/boards/${boardId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        const data = await response.json();
        if (data.status === "success") {
          setBoardName(data.data.board.name);
          setBoardDescription(data.data.board.description || "");
        }
      } catch (error) {
        console.error("Error fetching board data:", error);
      }
    };

    if (boardId) fetchBoardData();
  }, [boardId]);

  // ✅ Fetch notifications + unread count on toggle/open OR board/workspace change
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!showNotifications) return;

      setLoadingNotifications(true);
      try {
        const [notifRes, unreadRes] = await Promise.all([
          fetch("http://localhost:3000/api/v1/notifications", {
            credentials: "include",
          }),
          fetch("http://localhost:3000/api/v1/notifications/unread-count", {
            credentials: "include",
          }),
        ]);

        const notifData = await notifRes.json();
        const unreadData = await unreadRes.json();

        if (notifData.status === "success") {
          setNotifications(notifData.data.notifications || []);
        }
        if (unreadData.status === "success") {
          setUnreadCount(unreadData.data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [showNotifications, boardId, workspaceId]); // 👈 key fix here

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (cardId) {
      setTimeout(() => {
        const cardElement = document.getElementById(`card-${cardId}`);
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [cardId]);

  return (
    <div className="min-h-screen flex bg-[#f5f5f5] overflow-hidden relative -mt-8">
     
      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden p-3 transition-all duration-300 w-[1115px]">

{/*       
         <div className="w-full flex justify-end items-center px-2 py-1 rounded-md -mb-5 relative">
         
          <button
            className="relative mr-4"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <img
              src={notifyIcon}
              alt="Notifications"
              className="w-6 h-6 object-contain"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popup */}
          {/* {showNotifications && (
            <NotificationPopup
              ref={notificationRef}
              notifications={notifications}
              loading={loadingNotifications}
              unreadCount={unreadCount}
            />
          )}

          
          <img
            src={profile}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover cursor-pointer"
          />
        </div>   */}

        {/* Project Info and Board */}
        <ProjectInfo
          isSidebarOpen={isSidebarOpen}
          boardName={boardName}
          boardDescription={boardDescription}
          boardId={boardId}
        />
        <Board
          isSidebarOpen={isSidebarOpen}
          workspaceId={workspaceId}
          boardId={boardId}
          restoredLists={restoredLists}
        />
      </div>
    </div>
  );
};

export default MainBoard;


