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
  const [restoredCard, setRestoredCard] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [boardCreatedAt, setBoardCreatedAt] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [loadingBoard, setLoadingBoard] = useState(true);

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

  const handleCardRestored = (card) => {
    setRestoredCard(card);
  };

  // Fetch board info with complete data
  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        setLoadingBoard(true);
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
          setBoardCreatedAt(data.data.board.createdAt);
          setBoardData(data.data.board); // Store complete board data
        }
      } catch (error) {
        console.error("Error fetching board data:", error);
      } finally {
        setLoadingBoard(false);
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
       
        {/* Project Info and Board */}
        <ProjectInfo
          isSidebarOpen={isSidebarOpen}
          boardName={boardName}
          boardDescription={boardDescription}
          boardId={boardId}
          onListRestored={handleListRestored}
          onCardRestored={handleCardRestored}
          boardCreatedAt={boardCreatedAt}
          members={boardData ? boardData.members : []}
        />
        <Board
          isSidebarOpen={isSidebarOpen}
          workspaceId={workspaceId}
          boardId={boardId}
          restoredLists={restoredLists}
          restoredCard={restoredCard}
          boardData={boardData}
          loadingBoard={loadingBoard}
        />
      </div>
    </div>
  );
};

export default MainBoard;


