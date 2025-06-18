import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  addSubtask,
  toggleSubtask,
  removeSubtask,
  fetchCardSubtasks,
} from "../features/Slice/cardSlice/cardDetailsSlice";
import { Check, Plus, X, Loader2 } from "lucide-react";

export default function CardSubtasks() {
  const dispatch = useDispatch();
  const cardId = useSelector((state) => state.cardDetails.id);
  const subtasks = useSelector((state) => state.cardDetails.subtasks || []);
  const subtasksLoading = useSelector(
    (state) => state.cardDetails.subtasksLoading
  );
  const subtasksError = useSelector((state) => state.cardDetails.subtasksError);
  const [newTaskText, setNewTaskText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Show toast on API error
  useEffect(() => {
    if (subtasksError) {
      toast.error(subtasksError);
    }
  }, [subtasksError]);

  // fetch the subtasks when the component loads if there is a card id
  useEffect(() => {
    if (cardId) {
      dispatch(fetchCardSubtasks(cardId))
        .unwrap()
        .catch((error) => {
          console.error("Error fetching subtasks:", error);
        });
    }
  }, [cardId, dispatch]);

  const handleAddSubtask = () => {
    const trimmedTitle = newTaskText.trim();

    if (!trimmedTitle) {
      toast.error("Task title cannot be empty");
      return;
    }

    // use the local action always, regardless of the card id
    dispatch(
      addSubtask({
        id: Date.now(), // use a temporary id
        text: trimmedTitle,
        title: trimmedTitle,
        completed: false,
      })
    );
    setNewTaskText("");
    setIsAdding(false);
  };

  const handleToggleSubtask = (id) => {
    // use the local action always
    dispatch(toggleSubtask(id));
  };

  const handleRemoveSubtask = (id) => {
    // use the local action always
    dispatch(removeSubtask(id));
  };

  // check if the task is completed based on API or UI
  const isTaskCompleted = (task) => {
    return task.isCompleted !== undefined ? task.isCompleted : task.completed;
  };

  // get the task text based on API or UI
  const getTaskText = (task) => {
    return task.title || task.text;
  };

  if (subtasksLoading && subtasks.length === 0) {
    return (
      <div className="mt-3 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Subtasks list */}
      {subtasks.length > 0 ? (
        subtasks.map((task) => (
          <div key={task.id || task._id} className="flex items-center py-2">
            <button
              className={`w-5 h-5 rounded-md border ${
                isTaskCompleted(task)
                  ? "bg-[#4D2D61] border-[#4D2D61]"
                  : "border-gray-400"
              } flex items-center justify-center mr-2`}
              onClick={() => handleToggleSubtask(task._id || task.id)}
            >
              {isTaskCompleted(task) ? (
                <Check size={12} className="text-white" />
              ) : null}
            </button>
            <span
              className={`flex-grow ${
                isTaskCompleted(task)
                  ? "line-through text-gray-500"
                  : "text-gray-800"
              }`}
            >
              {getTaskText(task)}
            </span>
            <button
              className="text-gray-400 hover:text-red-500"
              onClick={() => handleRemoveSubtask(task._id || task.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))
      ) : (
        <div className="text-gray-500 text-sm">No subtasks yet</div>
      )}

      {/* Add new task form */}
      {isAdding ? (
        <div className="mt-2 flex items-center">
          <button className="w-5 h-5 rounded-md border border-gray-400 flex items-center justify-center mr-2">
            {/* Empty checkbox */}
          </button>
          <input
            type="text"
            className="flex-grow focus:outline-none pb-1"
            placeholder="Enter task title"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
          <button
            className="ml-2 text-gray-400 hover:text-gray-600"
            onClick={() => setIsAdding(false)}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          className="mt-3 flex items-center gap-1 py-2 px-4 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] text-white rounded-md text-sm font-medium"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={16} />
          Add task
        </button>
      )}
    </div>
  );
}
