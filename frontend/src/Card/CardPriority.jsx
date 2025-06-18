import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updatePriority } from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardPriority() {
  const dispatch = useDispatch();
  const cardId = useSelector((state) => state.cardDetails.id);
  const priority = useSelector((state) => state.cardDetails.priority);
  const [isOpen, setIsOpen] = useState(false);

  const priorities = [
    { label: "high", value: "high", color: "#DC2626" }, // أحمر
    { label: "medium", value: "medium", color: "#F59E0B" }, // أصفر
    { label: "low", value: "low", color: "#16A34A" }, // أخضر
    { label: "none", value: "none", color: "#9CA3AF" }, // رمادي
  ];

  // التحقق من وجود أولوية صالحة، وتعيين القيمة الافتراضية إلى "medium" إذا كانت غير صالحة
  const currentPriority = priorities.find(
    (p) => p.value === priority.toLowerCase()
  )
    ? priority.toLowerCase()
    : "medium";

  const dropdownRef = useRef(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // دالة لتحديث الأولوية محليًا فقط
  const handleUpdatePriority = (newPriority) => {
    // تحديث الحالة المحلية فقط
    dispatch(updatePriority(newPriority));
    setIsOpen(false);
  };

  // الحصول على لون الأولوية الحالية
  const currentPriorityObj =
    priorities.find((p) => p.value === currentPriority) || priorities[1]; // الافتراضي هو "medium"

  return (
    <div className="flex flex-row items-center mt-4 w-full">
      {/* أيقونة و عنوان الأولوية */}
      <div className="w-30 text-gray-500 flex items-center">
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.576 1.424a.6.6 0 0 1 .848 0l10.152 10.152a.6.6 0 0 1 0 .848L12.424 22.576a.6.6 0 0 1-.848 0L1.424 12.424a.6.6 0 0 1 0-.848zM12 7l4 4m-4-4l-4 4.167M12 7v9"
          />
        </svg>
        Priority
      </div>

      {/* زر عرض الأولوية الحالية */}
      <div
        className="relative"
        ref={dropdownRef}
      >
        <button
          className="px-3 py-1 rounded-md text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: `${currentPriorityObj.color}33`, // شفافية للخلفية
            color: currentPriorityObj.color, // لون النص
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {currentPriorityObj.label.charAt(0).toUpperCase() +
            currentPriorityObj.label.slice(1)}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* القائمة المنسدلة */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-32 max-[320px]:w-full bg-white border border-gray-300 rounded-md shadow-lg z-50">
            {priorities.map((p) => (
              <div
                key={p.value}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${currentPriority === p.value ? 'bg-gray-100' : ''} hover:bg-gray-100`}
                onClick={() => handleUpdatePriority(p.value)}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span style={{ color: p.color }}>
                  {p.label.charAt(0).toUpperCase() + p.label.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
