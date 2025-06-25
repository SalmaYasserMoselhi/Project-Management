import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  updateTitle,
  setSaveError,
} from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardHeader({ cardId, externalError }) {
  const dispatch = useDispatch();
  const title = useSelector((state) => state.cardDetails.title);
  const [localTitle, setLocalTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // تحديث العنوان المحلي عند تغيير عنوان البطاقة في Redux
  useEffect(() => {
    // تعيين العنوان المحلي فقط إذا كان العنوان من Redux ليس "Card name"
    if (title && title !== "Card name") {
      setLocalTitle(title);
    }
  }, [title]);

  // تتبع الخطأ الخارجي
  useEffect(() => {
    if (externalError) {
      // إذا وجد خطأ خارجي وكان متعلقًا بالعنوان، ابدأ وضع التعديل تلقائيًا
      if (
        externalError.includes("title") ||
        externalError.includes("Card name")
      ) {
        setIsEditing(true);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
      }
    }
  }, [externalError]);

  const handleTitleChange = (e) => {
    setLocalTitle(e.target.value);
    // عند بدء الكتابة، إزالة أي خطأ في Redux
    if (e.target.value.trim() !== "") {
      dispatch(setSaveError(null));
    }
  };

  const handleEditStart = () => {
    setIsEditing(true);
    // إذا كان العنوان المحلي فارغًا أو "Card name"، عرض حقل إدخال فارغ
    if (!localTitle || localTitle === "Card name") {
      setLocalTitle("");
    }

    // تركيز حقل الإدخال في الدورة التالية
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select(); // تحديد النص بالكامل عند تفعيل التعديل
      }
    }, 0);
  };

  const handleSaveTitle = () => {
    // التحقق من العنوان ليس فارغًا
    const trimmedTitle = localTitle.trim();
    if (!trimmedTitle) {
      toast.error("Card title is required");
      return;
    }

    // حفظ العنوان فقط إذا تغير
    if (trimmedTitle !== title) {
      dispatch(updateTitle(trimmedTitle));
    }

    // إزالة أي رسائل خطأ في Redux
    dispatch(setSaveError(null));

    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      // استعادة القيمة الأصلية عند الضغط على Escape
      setLocalTitle(title === "Card name" ? "" : title);
      setIsEditing(false);
    }
  };

  // تحقق إذا كان العنوان فارغًا أو هو العنوان الافتراضي
  const hasInvalidTitle =
    !localTitle || localTitle.trim() === "" || localTitle === "Card name";

  return (
    <div className="flex justify-between items-center pb-2">
      {/* Title (editable) */}
      <div className="flex-1 relative">
        {isEditing ? (
          <input
            ref={inputRef}
            value={localTitle}
            onChange={handleTitleChange}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-xl font-bold w-full border-none focus:ring-0 focus:outline-none"
            placeholder="Card name"
          />
        ) : (
          <h1
            className={`text-xl font-bold cursor-pointer w-full truncate ${
              hasInvalidTitle ? "text-gray-400" : ""
            }`}
            onClick={handleEditStart}
          >
            {localTitle || "Card name"}
          </h1>
        )}
      </div>
    </div>
  );
}
