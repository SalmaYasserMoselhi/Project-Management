import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateTitle,
  setSaveError,
} from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardHeader({ cardId, externalError }) {
  const dispatch = useDispatch();
  const title = useSelector((state) => state.cardDetails.title);
  const [localTitle, setLocalTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
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
      setError(externalError);
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
    // عند بدء الكتابة، إزالة أي رسالة خطأ موجودة
    if (error) setError("");

    // كذلك إزالة أي خطأ في Redux
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
    // إزالة أي رسائل خطأ
    setError("");

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
      setError("Card title is required");
      return;
    }

    // حفظ العنوان فقط إذا تغير
    if (trimmedTitle !== title) {
      dispatch(updateTitle(trimmedTitle));
    }

    // إزالة أي رسائل خطأ في Redux
    dispatch(setSaveError(null));

    setIsEditing(false);
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      // استعادة القيمة الأصلية عند الضغط على Escape
      setLocalTitle(title === "Card name" ? "" : title);
      setIsEditing(false);
      setError("");
    }
  };

  // تحقق إذا كان العنوان فارغًا أو هو العنوان الافتراضي
  const hasInvalidTitle =
    !localTitle || localTitle.trim() === "" || localTitle === "Card name";

  return (
    <div className="flex justify-between items-center pb-2">
      {isEditing ? (
        <div className="flex-1 relative">
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
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
      ) : (
        <div className="flex-1 relative">
          <h1
            className={`text-xl font-bold cursor-pointer w-full truncate ${
              hasInvalidTitle ? "text-gray-400" : ""
            }`}
            onClick={handleEditStart}
          >
            {localTitle || "Card name"}
          </h1>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
      )}
    </div>
  );
}
