import { useSelector } from "react-redux";
import CardSubtasks from "./CardSubtasks";
import { useState } from "react";
import CardComments from "./CardComments";

export default function TabsContainer() {
  const subtasks = useSelector((state) => state.cardDetails.subtasks || []);
  const comments = useSelector((state) => state.cardDetails.comments || []);
  const [activeTab, setActiveTab] = useState("subtasks");

  // Calculate completed tasks with compatibility for both API and UI format
  const completedTasks = subtasks.filter((task) =>
    task.isCompleted !== undefined ? task.isCompleted : task.completed
  ).length;

  // Calculate total comments count (including replies)
  const getTotalCommentsCount = () => {
    let count = comments.length;
    // Add replies count
    comments.forEach((comment) => {
      if (comment.replies && Array.isArray(comment.replies)) {
        count += comment.replies.length;
      }
    });
    return count;
  };

  const commentsCount = getTotalCommentsCount();

  return (
    <div className="mt-4">
      {/* Tabs */}
      <div className="flex border-b border-b-gray-300">
        <button
          className={`py-2 px-4 flex items-center ${
            activeTab === "subtasks"
              ? "border-b-2 border-[#4D2D61] text-[#4D2D61] font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("subtasks")}
        >
          <span>Subtasks</span>
          <div className="ml-2 flex items-center">
            <div
              className={`h-5 px-2 rounded-full flex items-center justify-center text-xs ${
                activeTab === "subtasks"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {completedTasks}/{subtasks.length}
            </div>
          </div>
        </button>

        <button
          className={`py-2 px-4 flex items-center ${
            activeTab === "comments"
              ? "border-b-2 border-[#4D2D61] text-[#4D2D61] font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("comments")}
        >
          <span>Comments</span>
          <div className="ml-2 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
            {commentsCount}
          </div>
        </button>
      </div>

      {activeTab === "subtasks" && <CardSubtasks />}
      {activeTab === "comments" && <CardComments />}
    </div>
  );
}
