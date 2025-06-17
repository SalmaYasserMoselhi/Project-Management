import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const CustomDropdown = ({ 
  options = [], 
  selected, 
  onChange, 
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  optionClassName = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectOption = (option) => {
    onChange(option.value);
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

  // Get the label for the selected value
  const selectedLabel = options.find(opt => opt.value === selected)?.label || selected;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        className={`w-26 text-sm font-normal text-gray-600 border-0 rounded-lg px-4 py-2 bg-gray-100 flex items-center justify-between hover:bg-gray-200 transition-colors ${buttonClassName}`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedLabel}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600 ml-2" />
        )}
      </button>

      {isOpen && (
        <div 
          className={`absolute z-10 mt-1 min-w-full bg-white rounded-lg shadow-lg border border-gray-200 ${dropdownClassName}`}
          role="listbox"
        >
          {options.map((option, index) => (
            <div key={option.value || option}>
              <button
                className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
                  selected === option.value ? "bg-purple-50 text-purple-700" : ""
                } ${optionClassName}`}
                onClick={() => selectOption(option)}
                role="option"
                aria-selected={selected === option.value}
              >
                {option.label || option}
              </button>
              {index < options.length - 1 && (
                <div className="border-t border-gray-200"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;