import { useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateTitle,
  updateCardTitle,
} from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardHeader({ onClose, cardId }) {
  const dispatch = useDispatch();
  const { title, id, loading } = useSelector((state) => state.cardDetails);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // تفعيل نمط التحرير عند النقر على العنوان
  const handleTitleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.select(); // تحديد النص بالكامل عند تفعيل التعديل
    }, 0);
  };

  // معالجة إنهاء التحرير
  const handleBlur = async (e) => {
    const newTitle = e.target.value.trim();
    setIsEditing(false);

    // عدم حفظ العنوان إذا لم يتغير
    if (newTitle === title || !newTitle) {
      return;
    }

    // تحديث العنوان في Redux أولاً (للاستجابة السريعة للمستخدم)
    dispatch(updateTitle(newTitle));

    // إذا كانت البطاقة موجودة (لها معرف)، قم بتحديثها على الخادم
    if (cardId || id) {
      setIsSaving(true);
      setError(null);
      try {
        // استخدام async thunk للتحديث
        await dispatch(
          updateCardTitle({
            cardId: cardId || id,
            title: newTitle,
          })
        ).unwrap();
      } catch (err) {
        console.error("Error updating card title:", err);
        setError("Could not save title");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // معالجة المفاتيح المضغوطة أثناء التحرير
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current.blur(); // إنهاء التحرير وتنفيذ handleBlur
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false); // إلغاء التحرير بدون حفظ
    }
  };

  return (
    <div className="flex justify-between items-center pb-2">
      {isEditing ? (
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            defaultValue={title}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-xl font-bold w-full border-none focus:ring-0 focus:outline-none"
            placeholder="Card title"
          />
          {isSaving && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              Saving...
            </span>
          )}
        </div>
      ) : (
        <div className="flex-1 relative">
          <h1
            className="text-xl font-bold cursor-pointer w-full truncate"
            onClick={handleTitleClick}
          >
            {title}
          </h1>
          {error && (
            <span className="absolute left-0 -bottom-4 text-xs text-red-500">
              {error}
            </span>
          )}
          {isSaving && (
            <span className="absolute left-0 -bottom-4 text-xs text-gray-400">
              Saving...
            </span>
          )}
        </div>
      )}
      <button
        className="text-gray-500 hover:text-gray-700 text-2xl ml-4"
        onClick={onClose}
      >
        &times;
      </button>
    </div>
  );
}
