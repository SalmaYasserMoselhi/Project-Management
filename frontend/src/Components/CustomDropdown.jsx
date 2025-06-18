import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const CustomDropdown = ({
  options = [],
  selected,
  onChange,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  optionClassName = "",
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
  const selectedLabel =
    options.find((opt) => opt.value === selected)?.label || selected;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        className={`px-3 py-1 rounded-md text-sm font-medium flex items-center gap-2 w-28 justify-between border border-[#D6C3EA] bg-[#4D2D6120] text-[#6A3B82] transition-colors ${buttonClassName}`}
        style={{ minWidth: "7rem" }}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <ChevronDown
          className={`ml-2 text-[#6a3b82] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          size={18}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-10 mt-2 w-28 min-w-full bg-white rounded-md shadow-lg border border-[#D6C3EA] ${dropdownClassName}`}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              key={option.value || option}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                selected === option.value
                  ? "bg-purple-50 text-[#6A3B82] font-semibold"
                  : "text-[#6A3B82]"
              } hover:bg-gray-100 transition-colors ${optionClassName}`}
              onClick={() => selectOption(option)}
              role="option"
              aria-selected={selected === option.value}
            >
              {option.label || option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
