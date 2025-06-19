import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  fetchCardDetails,
  saveCard,
  updateListId,
  resetCardDetails,
  uploadAttachments,
  deleteAttachment,
  setSaveError,
  setBoardId,
} from "../features/Slice/cardSlice/cardDetailsSlice";
import CardHeader from "./CardHeader";
import CardDueDate from "./CardDueDate";
import CardLabels from "./CardLabels";
import CardStatus from "./CardStatus";
import CardPriority from "./CardPriority";
import CardDescription from "./CardDescription";
import CardAssignees from "./CardAssignees";
import CardAttachments from "./CardAttachments";
import TabsContainer from "./TabsContainer";

export default function CardDetails({
  onClose,
  currentListId,
  boardId,
  allLists,
  cardId = null,
  onCardSaved,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [initialCardState, setInitialCardState] = useState(null);

  const cardRef = useRef(null);
  const attachmentsRef = useRef();
  const hasUserChangesRef = useRef(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cardDetails = useSelector((state) => state.cardDetails);
  const {
    id,
    title,
    description,
    listId,
    dueDate,
    priority,
    labels,
    attachments,
    subtasks,
    comments,
    loading,
    error,
    saveLoading,
    saveError,
  } = cardDetails;

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast.error(typeof error === "string" ? error : error.message);
    }
  }, [error]);

  useEffect(() => {
    if (saveError) {
      toast.error(
        typeof saveError === "string" ? saveError : saveError.message
      );
    }
  }, [saveError]);

  // إعادة تعيين حالة البطاقة عند فتح البطاقة
  useEffect(() => {
    // إذا كانت بطاقة جديدة، نقوم بإعادة تعيين الحالة وتعيين القائمة الافتراضية
    if (!cardId) {
      dispatch(resetCardDetails());
      if (currentListId) {
        dispatch(updateListId(currentListId));
      }

      // Set boardId for new cards
      if (boardId) {
        dispatch(setBoardId(boardId));
      }

      // Initialize empty state for new cards
      setInitialCardState({
        title: "",
        description: "",
        listId: currentListId,
        priority: "medium",
        subtasksLength: 0,
      });
    }
    // إذا كانت بطاقة موجودة، نقوم بجلب بياناتها
    else {
      dispatch(fetchCardDetails(cardId));

      // Set boardId for existing cards if not returned by API
      if (boardId) {
        dispatch(setBoardId(boardId));
      }
    }

    // تنظيف الحالة عند إغلاق المكون
    return () => {
      dispatch(resetCardDetails());
    };
  }, [dispatch, cardId, currentListId, boardId]);

  // حفظ الحالة الأولية بعد تحميل البيانات
  useEffect(() => {
    // Only update initial state for existing cards (new cards are handled in the first effect)
    if (!loading && id && !initialCardState && cardId) {
      // نسخ الحالة الحالية كحالة أولية للمقارنة لاحقاً
      setInitialCardState({
        title,
        description,
        listId,
        priority,
        subtasksLength: subtasks?.length || 0,
      });
    }
  }, [
    loading,
    id,
    title,
    description,
    listId,
    priority,
    subtasks,
    initialCardState,
    cardId,
  ]);

  // تتبع التغييرات التي يقوم بها المستخدم
  useEffect(() => {
    // لا نتحقق من التغييرات إلا بعد تحميل البيانات الأولية
    if (!initialCardState) return;

    // For new cards, check if user has added any content
    if (!cardId && !id) {
      const hasContent =
        (title && title !== "Card name" && title.trim() !== "") ||
        (description && description.trim() !== "") ||
        subtasks?.length > 0;

      setHasUserChanges(hasContent);
      console.log("New card changes detected:", hasContent);
      return;
    }

    // For existing cards, check if there are differences from initial state
    const hasChanged =
      title !== initialCardState.title ||
      description !== initialCardState.description ||
      listId !== initialCardState.listId ||
      priority !== initialCardState.priority ||
      (subtasks?.length || 0) !== initialCardState.subtasksLength;

    setHasUserChanges(hasChanged);
    console.log("Changes detected:", hasChanged);
  }, [
    title,
    description,
    listId,
    priority,
    subtasks,
    initialCardState,
    loading,
    cardId,
    id,
  ]);

  // Update ref when hasUserChanges changes
  useEffect(() => {
    hasUserChangesRef.current = hasUserChanges;
  }, [hasUserChanges]);

  // إضافة مستمع لإغلاق الكارد عند النقر خارجه
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        handleCloseAttempt();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // إضافة مستمع لمفتاح Escape
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleCloseAttempt();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen]);

  // التحقق من التغييرات قبل الإغلاق
  const handleCloseAttempt = () => {
    console.log("Close attempt, has changes:", hasUserChangesRef.current);
    if (hasUserChangesRef.current) {
      setShowConfirmDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  // معالجة النقر على زر "تم" - حفظ البطاقة باستخدام async thunk
  const handleDone = async () => {
    // التحقق من وجود عنوان للبطاقة
    if (!title || title.trim() === "" || title === "Card name") {
      // تحديد عنصر العنوان وتمرير إليه
      const titleElement = document.getElementById("card-title-container");
      if (titleElement) {
        titleElement.scrollIntoView({ behavior: "smooth" });
      }

      // Set save error for title
      dispatch(setSaveError("Card title is required"));

      return;
    }

    // جمع كافة بيانات البطاقة من Redux
    const cardData = {
      title,
      description,
      listId,
      boardId: boardId || cardDetails.boardId, // Ensure boardId is included
      priority,
      dueDate, // الهيكل: { startDate (اليوم), endDate (تاريخ الاستحقاق) }
      labels,
      attachments,
      subtasks,
      comments,
    };

    // التحقق من وجود listId صالح
    if (!listId) {
      console.error("No valid listId found");
      return;
    }

    // Store the original list ID to track if it changed
    const originalListId = currentListId;
    const hasChangedList = originalListId !== listId;

    try {
      // 1. حفظ البطاقة الأساسية أولاً
      const savedCard = await dispatch(
        saveCard({
          cardId: cardId || id, // استخدام معرف البطاقة المخزن إذا كان cardId غير موجود
          cardData,
          originalListId: originalListId, // Pass the original list ID
        })
      ).unwrap();

      const savedCardId =
        savedCard.card?._id || savedCard.card?.id || cardId || id;

      // 2. معالجة المرفقات
      if (attachmentsRef.current) {
        // رفع الملفات الجديدة
        const pendingFiles = attachmentsRef.current.getPendingFiles?.() || [];
        if (pendingFiles.length > 0) {
          await dispatch(
            uploadAttachments({
              cardId: savedCardId,
              files: pendingFiles,
            })
          ).unwrap();
        }

        // حذف المرفقات المحذوفة
        const deletedAttachmentIds =
          attachmentsRef.current.getDeletedAttachmentIds?.() || [];
        for (const attachmentId of deletedAttachmentIds) {
          await dispatch(
            deleteAttachment({
              cardId: savedCardId,
              attachmentId,
            })
          ).unwrap();
        }
      }

      // Notify parent component that card was saved
      if (onCardSaved) {
        // If list was changed, pass information about both lists that need refreshing
        if (hasChangedList) {
          onCardSaved(originalListId, listId);
        } else {
          onCardSaved();
        }
      }

      // إعادة تعيين علامة التغييرات
      setHasUserChanges(false);

      // Close the dialog only after everything is complete
      handleClose();
    } catch (err) {
      console.error("Error saving card:", err);
      // التحقق إذا كان الخطأ بسبب عدم تسجيل الدخول
      if (
        err &&
        (err.includes("not logged in") ||
          err.includes("log in") ||
          err.status === 401)
      ) {
        alert("Your session has expired. Please log in again.");
        navigate("/login");
      }
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div
            ref={cardRef}
            className="w-full max-w-[550px] max-h-[90vh] bg-white shadow-lg rounded-lg border border-gray-300 flex flex-col relative"
          >
            {loading && cardId ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D2D61]"></div>
                <p className="mt-4 text-gray-600">Loading card details...</p>
              </div>
            ) : (
              <>
                {/* زر الإغلاق في الأعلى على اليمين */}
                <button
                  className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-2xl z-10"
                  onClick={handleCloseAttempt}
                >
                  &times;
                </button>

                {/* الرأس - يبقى ثابتًا في الأعلى */}
                <div
                  className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2"
                  id="card-title-container"
                >
                  <div className="flex-grow">
                    <CardHeader
                      cardId={cardId || id}
                      externalError={
                        saveError && saveError.includes("title")
                          ? saveError
                          : null
                      }
                    />
                  </div>
                </div>

                {/* منطقة المحتوى القابلة للتمرير */}
                <div className="flex-grow overflow-y-auto px-3 sm:px-4">
                  {/* قسم معلومات البطاقة الرئيسي */}
                  <div className="space-y-3 sm:space-y-4">
                    <CardStatus
                      boardId={boardId}
                      lists={allLists}
                      currentListId={listId || currentListId}
                    />
                    <CardDueDate cardId={cardId || id} />
                    <CardAssignees cardId={cardId || id} />
                    <CardLabels cardId={cardId || id} />
                    <CardPriority cardId={cardId || id} />
                    <CardDescription cardId={cardId || id} />
                    <CardAttachments
                      ref={attachmentsRef}
                      cardId={cardId || id}
                    />
                    <TabsContainer cardId={cardId || id} />
                  </div>
                </div>

                {/* تذييل مع زر "تم" */}
                <div className="px-3 sm:px-4 py-3 border-t border-gray-200 flex justify-end mt-2">
                  <button
                    onClick={handleDone}
                    disabled={saveLoading}
                    className={`bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] text-white font-medium py-2 px-6 rounded-md transition-colors ${
                      saveLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {saveLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* مربع حوار التأكيد */}
          {showConfirmDialog && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold mb-2">Unsaved Changes</h3>
                <p className="mb-6">
                  {cardId
                    ? "You have unsaved changes. Do you want to save your changes before closing?"
                    : "This card hasn't been saved yet. Do you want to save it before closing?"}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      handleClose();
                    }}
                  >
                    {cardId ? "Discard Changes" : "Discard Card"}
                  </button>
                  <button
                    className="bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] text-white font-medium py-2 px-6 rounded-md transition-colors"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      handleDone();
                    }}
                  >
                    Save {cardId ? "Changes" : "Card"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
