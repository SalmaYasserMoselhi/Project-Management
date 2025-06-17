import { useState, useEffect, useRef } from "react";

export default function TimePicker({
  initialTime,
  onTimeChange,
  isOpen,
  onClose,
  className = "",
}) {
  const timePickerRef = useRef(null);
  const [selectedTime, setSelectedTime] = useState(initialTime || new Date());

  // Extract time components for picker
  const [hour, setHour] = useState(() => {
    const h = selectedTime.getHours() % 12;
    return h === 0 ? 12 : h; // Convert 0 to 12 for 12-hour format
  });

  const [minute, setMinute] = useState(() => selectedTime.getMinutes());
  const [isPM, setIsPM] = useState(() => selectedTime.getHours() >= 12);

  // Update initialTime when it changes from parent
  useEffect(() => {
    if (initialTime) {
      setSelectedTime(initialTime);
      const h = initialTime.getHours() % 12;
      setHour(h === 0 ? 12 : h);
      setMinute(initialTime.getMinutes());
      setIsPM(initialTime.getHours() >= 12);
    }
  }, [initialTime]);

  // Apply time changes
  const applyTimeChanges = () => {
    const newTime = new Date(selectedTime);
    const hour24 = isPM
      ? hour === 12
        ? 12
        : hour + 12
      : hour === 12
      ? 0
      : hour;

    newTime.setHours(hour24);
    newTime.setMinutes(minute);
    newTime.setSeconds(0);

    setSelectedTime(newTime);
    // Call the parent's onTimeChange directly here instead of in useEffect
    if (onTimeChange) {
      onTimeChange(newTime);
    }
    onClose();
  };

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate minute options (00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  // Format time for display
  const formatTime = (time) => {
    return time.toLocaleTimeString("en-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`absolute z-50 mt-1 bg-white shadow-lg rounded-md border border-gray-300 p-3 w-64 ${className}`}
      ref={timePickerRef}
    >
      <div className="flex justify-between items-center">
        {/* Hour Picker */}
        <div className="w-1/3">
          <label className="text-xs text-gray-500 block mb-1">Hour</label>
          <select
            value={hour}
            onChange={(e) => setHour(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Minute Picker */}
        <div className="w-1/3 mx-2">
          <label className="text-xs text-gray-500 block mb-1">Minute</label>
          <select
            value={minute}
            onChange={(e) => setMinute(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        {/* AM/PM Picker */}
        <div className="w-1/3">
          <label className="text-xs text-gray-500 block mb-1">AM/PM</label>
          <select
            value={isPM ? "PM" : "AM"}
            onChange={(e) => setIsPM(e.target.value === "PM")}
            className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>

      {/* Apply Button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={applyTimeChanges}
          className="bg-[#4D2D61] text-white rounded-md px-3 py-1 text-sm"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
