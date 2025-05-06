import { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch, useSelector } from "react-redux";
import {
  updateDueDate,
  updateCardDueDate,
} from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardDueDate({ cardId }) {
  const dispatch = useDispatch();
  const { dueDate, id: storedCardId } = useSelector(
    (state) => state.cardDetails
  );
  const datePickerRef = useRef(null);
  const BASE_URL = "http://localhost:3000";
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // تنسيق التاريخ بتنسيق MM/DD/YYYY (للإرسال إلى API)
  const formatDateForAPI = (date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // تحديد تاريخ النهاية الافتراضي (بعد أسبوع من اليوم)
  const today = new Date();
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(today.getDate() + 7);

  // استخراج تاريخ النهاية من التاريخ المخزن
  const getEndDateFromStored = () => {
    if (!dueDate) return defaultEndDate;

    // إذا كان التاريخ المخزن هو كائن به endDate
    if (typeof dueDate === "object" && dueDate.endDate) {
      return new Date(dueDate.endDate);
    }

    // إذا كان التاريخ المخزن هو نص (ISO string)
    try {
      return new Date(dueDate);
    } catch (e) {
      console.error("Error parsing stored date:", e);
      return defaultEndDate;
    }
  };

  const [endDate, setEndDate] = useState(getEndDateFromStored());
  const [isOpen, setIsOpen] = useState(false);

  // تحديث التاريخ في Redux وإرساله إلى API
  useEffect(() => {
    // إنشاء كائن dueDate مع startDate تلقائي (اليوم) وendDate المحدد
    const dueDateObject = {
      startDate: formatDateForAPI(today),
      endDate: formatDateForAPI(endDate),
    };

    dispatch(updateDueDate(dueDateObject));

    // إذا كانت البطاقة موجودة، قم بتحديث التاريخ على الخادم
    const updateServerDueDate = async () => {
      const currentCardId = cardId || storedCardId;
      if (!currentCardId) return;

      setIsSaving(true);
      setError(null);

      try {
        // استخدام async thunk لتحديث التاريخ
        await dispatch(
          updateCardDueDate({
            cardId: currentCardId,
            dueDate: dueDateObject,
          })
        ).unwrap();
      } catch (err) {
        console.error("Error updating due date:", err);
        setError("Could not save date");
      } finally {
        setIsSaving(false);
      }
    };

    // تأخير التحديث لثانية واحدة لتجنب الطلبات المتكررة
    const timeoutId = setTimeout(updateServerDueDate, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [endDate, dispatch, cardId, storedCardId]);

  // إضافة مستمع للنقر لإغلاق منتقي التاريخ عند النقر خارجه
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // تنسيق التاريخ للعرض
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-row items-center mt-4 w-full max-[320px]:flex-col max-[320px]:items-start">
      {/* أيقونة وعنوان تاريخ الاستحقاق */}
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Due Date
      </div>

      {/* حقل التاريخ مع أيقونة التقويم */}
      <div
        className="relative max-[320px]:ml-4 max-[320px]:mt-2"
        ref={datePickerRef}
      >
        <div
          className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-400 flex items-center cursor-pointer w-34 max-[320px]:w-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="mr-1">{formatDateForDisplay(endDate)}</span>
          {isSaving && (
            <span className="text-xs text-gray-400 ml-1">Saving...</span>
          )}
          <svg
            className="w-4 h-4 text-gray-500 ml-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* منتقي التاريخ */}
        {isOpen && (
          <div className="absolute z-50 mt-1">
            <DatePicker
              selected={endDate}
              onChange={(date) => {
                setEndDate(date);
                setIsOpen(false);
              }}
              inline
              dateFormat="MM/dd/yyyy"
              minDate={today} // لا يمكن تحديد تاريخ قبل اليوم
            />
          </div>
        )}

        {error && (
          <div className="absolute left-0 mt-1 text-xs text-red-500">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
