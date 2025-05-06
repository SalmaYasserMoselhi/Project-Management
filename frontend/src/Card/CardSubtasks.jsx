import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addSubtask,
  toggleSubtask,
  removeSubtask,
  fetchCardSubtasks,
  addCardSubtask,
  toggleCardSubtask,
  deleteCardSubtask,
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
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [error, setError] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log("CardSubtasks - Current card ID:", cardId);
    console.log("CardSubtasks - Current subtasks:", subtasks);
  }, [cardId, subtasks]);

  // جلب المهام الفرعية عند تحميل المكون إذا كان هناك معرف بطاقة
  useEffect(() => {
    if (cardId) {
      console.log(`Fetching subtasks for card ${cardId}`);
      dispatch(fetchCardSubtasks(cardId))
        .unwrap()
        .then((data) => {
          console.log("Subtasks fetched successfully:", data);
        })
        .catch((error) => {
          console.error("Error fetching subtasks:", error);
        });
    }
  }, [cardId, dispatch]);

  const handleAddSubtask = () => {
    const trimmedTitle = newTaskText.trim();

    if (!trimmedTitle) {
      setError("Task title cannot be empty");
      return;
    }

    setError(null);

    if (cardId) {
      // إذا كان هناك معرف بطاقة، استخدم API
      console.log(`Adding subtask to card ${cardId}:`, trimmedTitle);

      dispatch(
        addCardSubtask({
          cardId,
          title: trimmedTitle,
        })
      )
        .unwrap()
        .then((response) => {
          console.log("Subtask added successfully:", response);
          setNewTaskText("");
          setIsAdding(false);
        })
        .catch((err) => {
          console.error("Error adding subtask:", err);
          setError(typeof err === "string" ? err : JSON.stringify(err));
        });
    } else {
      // استخدم الإجراء المحلي للمهام المؤقتة
      dispatch(
        addSubtask({
          id: Date.now(),
          text: trimmedTitle,
          title: trimmedTitle, // تخزين العنوان أيضًا لتجهيزه للإرسال لاحقًا
          completed: false,
        })
      );
      setNewTaskText("");
      setIsAdding(false);
    }
  };

  const handleToggleSubtask = (id) => {
    if (cardId) {
      // استخدم API
      console.log(`Toggling subtask ${id} for card ${cardId}`);
      setLoadingTaskId(id);
      dispatch(toggleCardSubtask({ cardId, subtaskId: id }))
        .unwrap()
        .then((response) => {
          console.log("Subtask toggled successfully:", response);
        })
        .catch((err) => {
          console.error("Error toggling subtask:", err);
          setError(typeof err === "string" ? err : JSON.stringify(err));
        })
        .finally(() => setLoadingTaskId(null));
    } else {
      // استخدم الإجراء المحلي
      dispatch(toggleSubtask(id));
    }
  };

  const handleRemoveSubtask = (id) => {
    if (cardId) {
      // استخدم API
      console.log(`Removing subtask ${id} from card ${cardId}`);
      setLoadingTaskId(id);
      dispatch(deleteCardSubtask({ cardId, subtaskId: id }))
        .unwrap()
        .then(() => {
          console.log("Subtask deleted successfully");
        })
        .catch((err) => {
          console.error("Error deleting subtask:", err);
          setError(typeof err === "string" ? err : JSON.stringify(err));
        })
        .finally(() => setLoadingTaskId(null));
    } else {
      // استخدم الإجراء المحلي
      dispatch(removeSubtask(id));
    }
  };

  // تحديد ما إذا كانت المهمة مكتملة استنادًا إلى API أو واجهة المستخدم
  const isTaskCompleted = (task) => {
    return task.isCompleted !== undefined ? task.isCompleted : task.completed;
  };

  // الحصول على نص المهمة استنادًا إلى API أو واجهة المستخدم
  const getTaskText = (task) => {
    return task.title || task.text;
  };

  if (subtasksLoading && !loadingTaskId && subtasks.length === 0) {
    return (
      <div className="mt-3 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Error message */}
      {(error || subtasksError) && (
        <div className="mb-3 text-red-500 text-sm bg-red-50 p-2 rounded">
          {error || subtasksError}
        </div>
      )}

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
              disabled={loadingTaskId === (task._id || task.id)}
            >
              {loadingTaskId === (task._id || task.id) ? (
                <Loader2 size={10} className="animate-spin text-white" />
              ) : isTaskCompleted(task) ? (
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
              disabled={loadingTaskId === (task._id || task.id)}
            >
              {loadingTaskId === (task._id || task.id) ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
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
          className="mt-3 flex items-center gap-1 py-2 px-4 bg-[#4D2D61] text-white rounded-md text-sm font-medium"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={16} />
          Add task
        </button>
      )}
    </div>
  );
}
