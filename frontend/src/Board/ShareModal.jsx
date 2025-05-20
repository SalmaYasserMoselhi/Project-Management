

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import avatar1 from "../assets/Avatar1.png";
import avatar2 from "../assets/Avatar2.png";
import avatar3 from "../assets/Avatar3.png";
import avatar4 from "../assets/Avatar4.png";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const roleDescriptions = {
  admin: "Can edit board details",
  member: "Can participate in board",
};

const defaultAvatars = [avatar1, avatar2, avatar3, avatar4];

const ShareModal = ({ isOpen, onClose, boardId }) => {
  const BASE_URL = "http://localhost:3000";
  const [inviteEmail, setInviteEmail] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const dropdownRefs = useRef([]);
  const modalRef = useRef(null);

  const nameMapping = {
    "fatmaemad4159@gmail.com": { firstName: "Fatma", lastName: "Emad" },
    "aamnaa022@gmail.com": { firstName: "Amena", lastName: "" },
  };

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

  const fetchBoardMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${BASE_URL}/api/v1/boards/${boardId}/members?page=1&limit=1000&sort=role,-joinedAt`,
        { withCredentials: true }
      );

      if (!res.data || !res.data.data || !Array.isArray(res.data.data.members)) {
        throw new Error("Invalid response structure: members array not found");
      }

      const members = res.data.data.members.map((member, index) => {
        const email = member.user?.email;
        const username = member.user?.username;
        const firstName = member.user?.firstName;
        const lastName = member.user?.lastName;

        let name;
        if (firstName && lastName) {
          name = `${firstName} ${lastName}`.trim();
        } else if (firstName) {
          name = firstName;
        } else if (email && nameMapping[email]) {
          const { firstName: mappedFirst, lastName: mappedLast } = nameMapping[email];
          name = mappedLast ? `${mappedFirst} ${mappedLast}`.trim() : mappedFirst;
        } else if (username && !username.startsWith("user_")) {
          name = username;
        } else if (email) {
          const emailPrefix = email.split("@")[0];
          const parts = emailPrefix.match(/([a-zA-Z]+)([0-9]*)$/);
          name = parts && parts[1] ? parts[1].replace(/([a-z])([A-Z])/g, "$1 $2") : emailPrefix;
        } else {
          name = `User ${index + 1}`;
        }

        return {
          name,
          email: email || "N/A",
          role: member.role || "member",
          image: member.user?.image || defaultAvatars[index % defaultAvatars.length],
          memberId: member._id || null,
          userId: member.user?._id || null, // ✅ Used for PATCH request
        };
      });

      setUsers(members);
      setSelectedRoles(members.map((u) => u.role));
    } catch (err) {
      console.error("Error fetching board members:", err);
      setError("Failed to load board members");
      toast.error("Failed to load board members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBoardMembers();
    }
  }, [isOpen, boardId]);

  const handleSelectRole = async (index, role) => {
    if (isUpdatingRole) return;
    setIsUpdatingRole(true);
    const user = users[index];

    if (user.role === "owner" || !user.userId) {
      setIsUpdatingRole(false);
      return;
    }

    try {
      await axios.patch(
        `${BASE_URL}/api/v1/boards/user-boards/${boardId}`,
        {
          members: [
            {
              user: user.userId, // ✅ Use correct userId here
              role: role,
            },
          ],
        },
        {
          withCredentials: true,
        }
      );

      const updatedRoles = [...selectedRoles];
      updatedRoles[index] = role;
      setSelectedRoles(updatedRoles);
      toast.success(`${user.name}'s role updated to ${role}`);
    } catch (err) {
      console.error("Error updating role:", err);
      toast.error("Failed to update role");
    } finally {
      setIsUpdatingRole(false);
      setOpenDropdown(null);
      setHoveredRole(null);
    }
  };

  const handleRemoveMember = async (userId, name) => {
    try {
      await axios.delete(`${BASE_URL}/api/v1/boards/${boardId}/members/${userId}`, {
        withCredentials: true,
      });
      toast.success(`${name} removed from board`);
      fetchBoardMembers();
    } catch (err) {
      console.error("Remove member error:", err);
      toast.error("Failed to remove member");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter a valid email");
      return;
    }

    const trimmedEmail = inviteEmail.trim();

    const isAlreadyMember = users.some(
      (member) => member.email.toLowerCase() === trimmedEmail.toLowerCase() && member.email !== "N/A"
    );
    if (isAlreadyMember) {
      toast.error("This user is already a board member");
      return;
    }

    try {
      const usersRes = await axios.get(`${BASE_URL}/api/v1/users?role=user`, {
        withCredentials: true,
      });
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
        { email: trimmedEmail, role: "member" },
        { withCredentials: true }
      );
      toast.success("Invitation sent successfully ✅");
      setInviteEmail("");
      fetchBoardMembers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invite failed");
      console.error("Invite error:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-black/50 z-50 flex items-center justify-center rounded-md">
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
            className="bg-[#4D2D61] text-white px-4 py-2 rounded-md text-md hover:bg-[#6A4C82]"
          >
            Invite
          </button>
        </div>

        <div>
          <p className="text-md font-medium mb-2 text-gray-500">
            People with access ({users.length})
          </p>

          {loading ? (
            <p>Loading members...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : users.length === 0 ? (
            <p>No members found</p>
          ) : (
            users.map((user, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <span className="font-medium text-md">{user.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {user.role === "owner" ? (
                    <span className="text-md border-gray-200 px-2 py-1 border">Owner</span>
                  ) : (
                    <div className="relative" ref={(el) => (dropdownRefs.current[index] = el)}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                        className="text-md border border-gray-200 px-2 py-1 bg-white flex items-center gap-1"
                        disabled={isUpdatingRole}
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
                        <div className="absolute right-0 mt-2 w-48 bg-white border shadow-lg z-10 rounded-md overflow-hidden">
                          {["admin", "member"].map((role) => {
                            const isHovered = hoveredRole === role;
                            const isSelected = selectedRoles[index] === role;
                            const shouldHighlight = isHovered || (!hoveredRole && isSelected);

                            return (
                              <div
                                key={role}
                                onClick={() => handleSelectRole(index, role)}
                                onMouseEnter={() => setHoveredRole(role)}
                                onMouseLeave={() => setHoveredRole(null)}
                                className={`px-3 py-2 cursor-pointer ${
                                  shouldHighlight ? "bg-[#4D2D61] text-white" : "text-gray-800"
                                }`}
                              >
                                <div className="font-medium capitalize">{role}</div>
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
                  {user.role !== "owner" && user.memberId && (
                    <button
                      onClick={() => handleRemoveMember(user.userId, user.name)}
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
