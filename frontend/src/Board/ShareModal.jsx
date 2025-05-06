

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import avatar1 from "../assets/Avatar1.png";
import avatar2 from "../assets/Avatar2.png";
import avatar3 from "../assets/Avatar3.png";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import avatar4 from "../assets/Avatar4.png";

const initialUsers = [
  { name: "Raj Mishra", role: "owner", image: avatar1 },
  { name: "John Connor", role: "admin", image: avatar2 },
  { name: "Raj Mishra", role: "member", image: avatar3 },
  { name: "Mary Trott", role: "member", image: avatar4 },
];

const roleDescriptions = {
  admin: "Can edit board details",
  member: "Can participate in board",
};

const ShareModal = ({ isOpen, onClose, boardId }) => {
  const BASE_URL = "http://localhost:3000";
  const [inviteEmail, setInviteEmail] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [selectedRoles, setSelectedRoles] = useState(initialUsers.map((u) => u.role));
  const [openDropdown, setOpenDropdown] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [boardMembers, setBoardMembers] = useState([]);
  const [inviteRole, setInviteRole] = useState("member");

  const dropdownRefs = useRef([]);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideDropdown =
        openDropdown !== null &&
        dropdownRefs.current[openDropdown] &&
        !dropdownRefs.current[openDropdown].contains(event.target);

      const clickedOutsideModal = modalRef.current && !modalRef.current.contains(event.target);

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

  useEffect(() => {
    setSelectedRoles(users.map((u) => u.role));
  }, [users]);

  const handleSelectRole = (index, role) => {
    const updatedRoles = [...selectedRoles];
    updatedRoles[index] = role;
    setSelectedRoles(updatedRoles);
    setOpenDropdown(null);
    setHoveredRole(null);
  };

  const fetchBoardMembers = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/v1/boards/${boardId}/members?page=1&limit=1000&sort=-joinedAt`,
        {
          withCredentials: true,
        }
      );
       console.log(res);
      setBoardMembers(res.data.data.members);
    } catch (err) {
      console.error("Error fetching board members", err);
    }
  };
  

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter a valid email");
      return;
    }

    const trimmedEmail = inviteEmail.trim();

    const isAlreadyMember = boardMembers.some(
      (member) => member.email.toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (isAlreadyMember) {
      toast.error("This user is already a board member");
      return;
    }

    try {
      const usersRes = await axios.get(`${BASE_URL}/api/v1/users?role=user`, { withCredentials: true });
      const users = usersRes.data.data.users;

      const userToInvite = users.find(
        (user) => user.email.toLowerCase() === trimmedEmail.toLowerCase()
      );


      if (!userToInvite) {
        toast.error("This user is not registered. Ask them to sign up first.");
        return;
      }

      await axios.post(
        `${BASE_URL}/api/v1/boards/${boardId}/invite`,
        {
          email: trimmedEmail,
          role: inviteRole,
        },
        { withCredentials: true }
      );
      toast.success("Invitation sent successfully ✅");
      setInviteEmail(""); 
       onClose(); 
       fetchBoardMembers(); 
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Invite failed");
      }
      console.error("Invite error:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-20 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-md">
      <div className="bg-white rounded-lg w-[90%] md:w-[600px] p-6 relative shadow-lg" ref={modalRef}>
        <button className="absolute top-4 right-4" onClick={onClose}>
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-2xl font-bold mb-2">Share this project</h2>
        <p className="text-md text-gray-500 mb-5">Manage the permissions for this project</p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Invite user by email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-grow px-3 py-3 border border-gray-300 rounded-md text-md"
          />
          <button
            onClick={handleInvite}
            className="bg-[#4D2D61] text-white px-4 py-2 rounded-md text-md transition-colors duration-200 hover:bg-[#6A4C82]"
          >
            Invite
          </button>
        </div>

        <div>
          <p className="text-md font-medium mb-2 text-gray-500">People with access ({users.length})</p>

          {users.map((user, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <span className="font-medium text-md">{user.name}</span>
              </div>

              {user.role === "owner" ? (
                <span className="text-md border-gray-200 px-2 py-1 border">Owner</span>
              ) : (
                <div className="relative" ref={(el) => (dropdownRefs.current[index] = el)}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                    className="text-md border border-gray-200 px-2 py-1 bg-white flex items-center gap-1"
                  >
                    {selectedRoles[index]}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openDropdown === index && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-white shadow-lg z-10 rounded-md overflow-hidden">
                      {["admin", "member"].map((role) => {
                        const isHovered = hoveredRole === role;
                        const isSelected = selectedRoles[index] === role;
                        const shouldHighlight =
                          isHovered || (!hoveredRole && isSelected);

                        return (
                          <div
                            key={role}
                            onClick={() => handleSelectRole(index, role)}
                            onMouseEnter={() => setHoveredRole(role)}
                            onMouseLeave={() => setHoveredRole(null)}
                            className={`px-3 py-2 cursor-pointer transition-colors duration-200 ${
                              shouldHighlight ? "bg-[#4D2D61] text-white" : "text-gray-800"
                            }`}
                          >
                            <div className="font-medium capitalize">{role}</div>
                            <div className={`text-sm ${shouldHighlight ? "text-white" : "text-gray-400"}`}>
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

