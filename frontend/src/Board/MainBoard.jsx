import { useParams } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import ProjectInfo from "./ProjectInfo";
import Board from "./Board";
import { useEffect, useState } from "react";

const MainBoard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { workspaceId, boardId } = useParams();
  const [restoredLists, setRestoredLists] = useState([]);

  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");

  const handleListRestored = (restoredList) => {
  setRestoredLists((prev) => [...prev, restoredList]);
};

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

        console.log("Fetched board data:", data);

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

  return (
    <div className="min-h-screen flex bg-[#f5f5f5] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden p-3 transition-all duration-300 w-[1115px]">
        <ProjectInfo
          isSidebarOpen={isSidebarOpen}
          boardName={boardName}
          boardDescription={boardDescription}
          boardId={boardId}
          // onListRestored={handleListRestored}
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
