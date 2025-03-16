import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const CustomDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("Weekly");
  const dropdownRef = useRef(null);

  const options = ["Weekly", "Monthly", "Yearly"];

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectOption = (option) => {
    setSelected(option);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        className="w-26 text-sm font-normal text-gray-600 border-0 rounded-lg px-4 py-2 bg-gray-100 flex items-center justify-between"
        onClick={toggleDropdown}
      >
        <span>{selected}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-24 bg-gray-100 rounded-lg shadow-lg">
          {options.map((option, index) => (
            <div key={option}>
              <div
                className="px-4 py-2 text-sm text-gray-600  cursor-pointer"
                onClick={() => selectOption(option)}
              >
                {option}
              </div>
              {index < options.length - 1 && (
                <div className="border-t border-gray-300 opacity-50 mx-2"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
