


import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import avatar1 from "../assets/Avatar1.png";
import avatar2 from "../assets/Avatar2.png";
import avatar3 from "../assets/Avatar3.png";
import avatar4 from "../assets/Avatar4.png";

const users = [
  { name: "Raj Mishra", role: "Owner", image: avatar1 },
  { name: "John Connor", role: "Admin", image: avatar2 },
  { name: "Raj Mishra", role: "Member", image: avatar3 },
  { name: "Mary Trott", role: "Member", image: avatar4 },
];

const roleDescriptions = {
  Admin: "Can edit board details",
  Member: "Can participate in board",
};

const ShareModal = ({ isOpen, onClose }) => {
  const [selectedRoles, setSelectedRoles] = useState(users.map((u) => u.role));
  const [openDropdown, setOpenDropdown] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);

  const dropdownRefs = useRef([]);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideDropdown =
        openDropdown !== null &&
        dropdownRefs.current[openDropdown] &&
        !dropdownRefs.current[openDropdown].contains(event.target);

      const clickedOutsideModal =
        modalRef.current && !modalRef.current.contains(event.target);

      if (clickedOutsideDropdown) {
        setOpenDropdown(null);
        setHoveredRole(null);
      }

      if (clickedOutsideModal) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown, onClose]);

  const handleSelectRole = (index, role) => {
    const updatedRoles = [...selectedRoles];
    updatedRoles[index] = role;
    setSelectedRoles(updatedRoles);
    setOpenDropdown(null);
    setHoveredRole(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-20 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-md">
      <div
        className="bg-white rounded-lg w-[90%] md:w-[600px] p-6 relative shadow-lg"
        ref={modalRef}
      >
        <button className="absolute top-4 right-4" onClick={onClose}>
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-2xl font-bold mb-2">Share this project</h2>
        <p className="text-md text-gray-500 mb-5">
          Manage the permissions for this project
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Invite user by name or email"
            className="flex-grow px-3 py-3 border border-gray-300 rounded-md text-md  "
          />
          <button className="bg-[#4D2D61] text-white px-4 py-2 rounded-md text-md transition">
            Invite
          </button>
        </div>

        <div>
          <p className="text-md font-medium mb-2 text-gray-500">
            People with access ({users.length})
          </p>

          {users.map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <span className="font-medium text-md">{user.name}</span>
              </div>

              {user.role === "Owner" ? (
                <span className="text-md border-gray-200 px-2 py-1 border">
                  Owner
                </span>
              ) : (
                <div className="relative" ref={(el) => (dropdownRefs.current[index] = el)}>
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === index ? null : index)
                    }
                    className="text-md border border-gray-200 px-2 py-1 bg-white flex items-center gap-1"
                  >
                    {selectedRoles[index]}
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {openDropdown === index && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-white shadow-lg z-10 rounded-md overflow-hidden">
                      {["Admin", "Member"].map((role) => {
                        const isHovered = hoveredRole === role;
                        const isSelected = selectedRoles[index] === role;
                        const shouldHighlight = isHovered || (!hoveredRole && isSelected);

                        return (
                          <div
                            key={role}
                            onClick={() => handleSelectRole(index, role)}
                            onMouseEnter={() => setHoveredRole(role)}
                            onMouseLeave={() => setHoveredRole(null)}
                            className={`px-3 py-2 cursor-pointer transition-colors duration-200 ${
                              shouldHighlight
                                ? "bg-[#4D2D61] text-white"
                                : "text-gray-800"
                            }`}
                          >
                            <div className="font-medium">{role}</div>
                            <div
                              className={`text-sm ${
                                shouldHighlight ? "text-white" : "text-gray-400"
                              }`}
                            >
                              {roleDescriptions[role]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

