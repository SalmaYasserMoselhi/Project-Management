import { useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateTitle } from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardHeader({ cardId }) {
  const dispatch = useDispatch();
  const { title, id, loading } = useSelector((state) => state.cardDetails);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // تفعيل نمط التحرير عند النقر على العنوان
  const handleTitleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.select(); // تحديد النص بالكامل عند تفعيل التعديل
    }, 0);
  };

  // معالجة إنهاء التحرير
  const handleBlur = (e) => {
    const newTitle = e.target.value.trim();
    setIsEditing(false);

    // عدم حفظ العنوان إذا لم يتغير
    if (newTitle === title || !newTitle) {
      return;
    }

    // تحديث العنوان في Redux فقط (لا يتم حفظه على الخادم)
    dispatch(updateTitle(newTitle));
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
        </div>
      ) : (
        <div className="flex-1 relative">
          <h1
            className="text-xl font-bold cursor-pointer w-full truncate"
            onClick={handleTitleClick}
          >
            {title}
          </h1>
        </div>
      )}
    </div>
  );
}
