"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import CalendarBlank from "../assets/CalendarBlank.png";
import edit from "../assets/edit.png";
import share from "../assets/share.png";
import { useSelector } from "react-redux";
import { Settings } from "lucide-react";
import ArchivedPopup from "./ArchivedPopup";
import SettingsPopup from "./SettingsPopup";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import InviteMembersPopup from "../Components/InviteMembersPopup";
import MembersModal from "../Components/MembersModal";

const ProjectInfo = ({
  boardName,
  boardDescription,
  boardId,
  onListRestored,
}) => {
  const BASE_URL = "http://localhost:3000";
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const currentUser = useSelector((state) => state.login.user);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const membersScrollRef = useRef(null);
  const nameInputRef = useRef(null);
  const descriptionTextareaRef = useRef(null);

  // State declarations
  const [showToast, setShowToast] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showArchivedPopup, setShowArchivedPopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorMembers, setErrorMembers] = useState(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [showErrorAlert, setShowErrorAlert] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [form, setForm] = useState({
    name: boardName || "Project Name",
    description: boardDescription || "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle list restoration callback
  const handleListRestored = (restoredList) => {
    onListRestored(restoredList);
  };

  // Ensure members is always an array
  const membersArray = useMemo(() => {
    if (!members) return [];
    return Array.isArray(members) ? members : [];
  }, [members]);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (roleDropdownOpen !== null) {
      const btn = document.getElementById(
        `role-dropdown-btn-${roleDropdownOpen}`
      );
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  };

  // Fetch members when component mounts or boardId changes
  useEffect(() => {
    if (boardId) {
      setLoadingMembers(true);
      const url = `${BASE_URL}/api/v1/boards/${boardId}/members`;
      fetch(url, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch members");
          return res.json();
        })
        .then((data) => {
          const members = (data.data?.members || data.members || []).map(
            (m) => ({
              ...m,
              id: m.id || m._id,
              name: m.user?.username || m.user?.email || "Unknown",
              avatar: m.user?.avatar,
              email: m.user?.email,
            })
          );
          if (members.length > 0) {
            setMembers(members);
          }
        })
        .catch((err) => setErrorMembers(err.message))
        .finally(() => setLoadingMembers(false));
    }
  }, [boardId]);

  // Auto-dismiss error alert
  useEffect(() => {
    if (showErrorAlert) {
      const timeout = setTimeout(() => {
        setShowErrorAlert(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [showErrorAlert]);

  // Update form when boardName or boardDescription props change
  useEffect(() => {
    setForm({
      name: boardName || "Project Name",
      description: boardDescription || "",
    });
  }, [boardName, boardDescription]);

  // Focus input or textarea when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
    if (editingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    }
  }, [editingName, editingDescription]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle archived popup toggle
  const handleArchivedClick = () => {
    setShowArchivedPopup(true);
    setShowDropdown(false);
  };

  // Handle board deletion
  const handleDeleteBoard = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this board?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${BASE_URL}/api/v1/boards/user-boards/${boardId}`, {
        withCredentials: true,
      });
      navigate("/main/dashboard");
      setShowToast(true);
      setShowDropdown(false);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error deleting board:", error);
      setShowErrorAlert("Failed to delete board.");
      setTimeout(() => setShowErrorAlert(null), 4000);
    }
  };

  // Handle save changes
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setShowErrorAlert(null);

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/boards/user-boards/${boardId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        let errorMsg = "Failed to update board";
        let errorData;
        try {
          errorData = await response.json();
        } catch {}
        if (errorData && errorData.message) {
          errorMsg = errorData.message;
        } else if (response.status === 403) {
          errorMsg = "You do not have permission to this action.";
        } else if (response.status === 400) {
          errorMsg = "The data provided is invalid or incomplete.";
        }
        setShowErrorAlert(errorMsg);
        setTimeout(() => setShowErrorAlert(null), 4000);
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setEditingName(false);
      setEditingDescription(false);
    } catch (err) {
      setShowErrorAlert(err.message || "Failed to update board");
      setTimeout(() => setShowErrorAlert(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Toggle editing modes
  const toggleEditName = () => setEditingName((v) => !v);
  const handleNameBlur = () => {
    setEditingName(false);
    handleSave(new Event("blur")); // Trigger save on blur
  };
  const handleNameKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleSave(e);
      setEditingName(false);
    }
  };
  const toggleEditDescription = () => setEditingDescription((v) => !v);
  const handleDescriptionBlur = () => {
    setEditingDescription(false);
    handleSave(new Event("blur")); // Trigger save on blur
  };
  const handleDescriptionKeyDown = async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSave(e);
      setEditingDescription(false);
    }
  };

  return (
    <>
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md z-50">
          Board deleted successfully!
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md z-50">
          Board updated successfully!
        </div>
      )}
      {showErrorAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-300 text-red-700 px-6 py-3 rounded-lg shadow-lg text-center min-w-[280px] max-w-[90vw]">
          {showErrorAlert}
        </div>
      )}

      {showMembersModal && (
        <MembersModal
          open={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          members={members}
          setMembers={setMembers}
          roleDropdownOpen={roleDropdownOpen}
          setRoleDropdownOpen={setRoleDropdownOpen}
          dropdownPos={dropdownPos}
          setDropdownPos={setDropdownPos}
          updateDropdownPosition={updateDropdownPosition}
          membersScrollRef={membersScrollRef}
          entityId={boardId}
          entityType="board"
          loadingMembers={loadingMembers}
          errorMembers={errorMembers}
          setLoadingMembers={setLoadingMembers}
          setErrorMembers={setErrorMembers}
        />
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 mt-7 transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start">
          <div>
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="text-2xl font-semibold border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#6a3b82] focus:border-transparent"
                placeholder="Project Name"
              />
            ) : (
              <h1 className="text-2xl font-semibold flex items-center gap-1">
                {form.name}
                <img
                  src={edit || "/placeholder.svg"}
                  alt="Edit"
                  className="w-4 h-4 cursor-pointer ms-2"
                  onClick={toggleEditName}
                />
              </h1>
            )}
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <img
                src={CalendarBlank || "/placeholder.svg"}
                alt="Calendar"
                className="w-4 h-4"
              />{" "}
              20 July
            </p>
          </div>

          <div
            className="flex items-center gap-5 mt-4 md:mt-0 ms-auto relative"
            ref={dropdownRef}
          >
            <div className="flex items-center gap-2 cursor-pointer">
              <img
                src={share || "/placeholder.svg"}
                alt="Share"
                className="w-8 h-8 rounded-full border-2 border-white"
                onClick={() => setShowInvitePopup(true)}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 18 24"
                onClick={() => setShowDropdown((prev) => !prev)}
                className="cursor-pointer"
              >
                <path
                  fill="none"
                  stroke="#4D2D61"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
                />
              </svg>
            </div>

            {showDropdown && (
              <div className="absolute top-12 right-0 bg-white border rounded-md shadow-lg w-48 z-10 border-white">
                <ul className="text-sm text-gray-700">
                  <li
                    onClick={handleArchivedClick}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Archived
                  </li>
                  <li
                    onClick={() => {
                      setShowSettingsPopup(true);
                      setShowDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Settings
                  </li>
                  <li
                    onClick={handleDeleteBoard}
                    className="px-4 py-2 hover:bg-red-100 text-red-600 cursor-pointer"
                  >
                    Delete
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          {editingDescription ? (
            <div className="flex items-center gap-2 mt-4 w-full">
              <textarea
                ref={descriptionTextareaRef}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                onBlur={handleDescriptionBlur}
                onKeyDown={handleDescriptionKeyDown}
                className="w-[60%] text-md text-gray-700 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6a3b82] focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-vertical"
                rows={2}
                placeholder="Add a board description"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <p className="text-gray-600 text-md">
                {form.description || "No description available"}
              </p>
              <img
                src={edit || "/placeholder.svg"}
                alt="Edit"
                className="w-4 h-4 cursor-pointer ml-2"
                onClick={toggleEditDescription}
              />
            </div>
          )}

          <div className="flex items-center gap-3 ml-4">
            <div className="flex -space-x-2">
              {membersArray.length === 0 && loadingMembers ? (
                <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-bold text-[#606C80]">
                  ...
                </span>
              ) : membersArray.length === 0 ? (
                <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-bold text-[#606C80]">
                  0
                </span>
              ) : (
                <>
                  {membersArray.slice(0, 4).map((member) =>
                    member.avatar ? (
                      <img
                        key={member.id}
                        src={member.avatar}
                        className="w-8 h-8 rounded-full border-2 border-white"
                        alt={member.name || member.user?.username || "Member"}
                      />
                    ) : (
                      <div
                        key={member.id}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-[#606C80] border-2 border-white"
                      >
                        {member.name?.charAt(0).toUpperCase() ||
                          member.user?.username?.charAt(0).toUpperCase() ||
                          member.user?.email?.charAt(0).toUpperCase() ||
                          "?"}
                      </div>
                    )
                  )}
                  {membersArray.length > 4 && (
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-bold text-[#606C80]">
                      +{membersArray.length - 4}
                    </span>
                  )}
                </>
              )}
            </div>
            <Settings
              className="w-5 h-5 text-[#4D2D61] cursor-pointer"
              onClick={() => setShowMembersModal(true)}
            />
          </div>
        </div>

        {showInvitePopup && (
          <InviteMembersPopup
            onClose={() => setShowInvitePopup(false)}
            entityType="board"
            entityId={boardId}
          />
        )}
        {showArchivedPopup && (
          <ArchivedPopup
            onClose={() => setShowArchivedPopup(false)}
            boardId={boardId}
            onListRestored={handleListRestored}
          />
        )}
        {showSettingsPopup && (
          <SettingsPopup
            onClose={() => setShowSettingsPopup(false)}
            boardId={boardId}
          />
        )}
      </div>
    </>
  );
};

export default ProjectInfo;
