import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchCardDetails,
  saveCard,
  updateListId,
  resetCardDetails,
  uploadAttachments,
  deleteAttachment,
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
  const attachmentsRef = useRef();
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
  } = useSelector((state) => state.cardDetails);

  // إعادة تعيين حالة البطاقة عند فتح البطاقة
  useEffect(() => {
    // طباعة للتصحيح
    // console.log("CardDetails - Props:", { currentListId, boardId, cardId });

    // إذا كانت بطاقة جديدة، نقوم بإعادة تعيين الحالة وتعيين القائمة الافتراضية
    if (!cardId) {
      dispatch(resetCardDetails());
      if (currentListId) {
        dispatch(updateListId(currentListId));
      }
    }
    // إذا كانت بطاقة موجودة، نقوم بجلب بياناتها
    else {
      dispatch(fetchCardDetails(cardId));
    }

    // تنظيف الحالة عند إغلاق المكون
    return () => {
      dispatch(resetCardDetails());
    };
  }, [dispatch, cardId, currentListId, boardId]);

  const handleClose = () => {
    setIsOpen(false);
    // Just close without saving changes
    if (onClose) onClose();
  };

  // معالجة النقر على زر "تم" - حفظ البطاقة باستخدام async thunk
  const handleDone = async () => {
    // جمع كافة بيانات البطاقة من Redux
    const cardData = {
      title,
      description,
      listId,
      boardId,
      priority,
      dueDate, // الهيكل: { startDate (اليوم), endDate (تاريخ الاستحقاق) }
      labels,
      attachments,
      subtasks,
      comments,
    };

    // طباعة البيانات للتصحيح
    // console.log("Sending card data:", cardData);

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

      // console.log("Card saved successfully:", savedCard);

      // Notify parent component that card was saved
      if (onCardSaved) {
        // If list was changed, pass information about both lists that need refreshing
        if (hasChangedList) {
          onCardSaved(originalListId, listId);
        } else {
          onCardSaved();
        }
      }

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

  // معالجة مفتاح الخروج من لوحة المفاتيح
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen]);

  // عرض شاشة التحميل أثناء جلب بيانات البطاقة
  if (loading && cardId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
        <div className="w-full max-w-[550px] max-h-[90vh] bg-white shadow-lg rounded-lg border border-gray-300 flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D2D61]"></div>
          <p className="mt-4 text-gray-600">Loading card details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-[550px] max-h-[90vh] bg-white shadow-lg rounded-lg border border-gray-300 flex flex-col relative">
            {/* زر الإغلاق في الأعلى على اليمين */}
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-2xl z-10"
              onClick={handleClose}
            >
              &times;
            </button>

            {/* الرأس - يبقى ثابتًا في الأعلى */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
              <div className="flex-grow">
                <CardHeader cardId={cardId || id} />
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
                <CardAttachments ref={attachmentsRef} cardId={cardId || id} />
                <TabsContainer cardId={cardId || id} />

                {error && (
                  <div className="text-red-500 text-sm py-2 px-3 bg-red-50 rounded-md">
                    {typeof error === "string"
                      ? error
                      : error.message || "An error occurred"}
                  </div>
                )}

                {saveError && (
                  <div className="text-red-500 text-sm py-2 px-3 bg-red-50 rounded-md">
                    {typeof saveError === "string"
                      ? saveError
                      : saveError.message || "Failed to save card"}
                  </div>
                )}
              </div>
            </div>

            {/* تذييل مع زر "تم" */}
            <div className="px-3 sm:px-4 py-3 border-t border-gray-200 flex justify-end mt-2">
              <button
                onClick={handleDone}
                disabled={saveLoading}
                className={`bg-[#4D2D61] hover:bg-[#57356A] text-white font-medium py-2 px-6 rounded-md transition-colors ${
                  saveLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {saveLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
