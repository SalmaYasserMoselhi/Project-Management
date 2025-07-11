"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import CalendarBlank from "../assets/CalendarBlank.png";
import { useSelector } from "react-redux";
import { Settings, Edit, MoreHorizontal, Calendar } from "lucide-react";
import ArchivedPopup from "./ArchivedPopup";
import SettingsPopup from "./SettingsPopup";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import InviteMembersPopup from "../Components/InviteMembersPopup";
import MembersModal from "../Components/MembersModal";
import UserAvatar from "../Components/UserAvatar";
import DeleteConfirmationDialog from "../Components/DeleteConfirmationDialog";
import {
  getBoardErrorMessage,
  logBoardError,
} from "../utils/boardErrorHandler";
import { toast } from "react-hot-toast";

const avatarColors = [
  "#4D2D61",
  "#7b4397",
  "#3498db",
  "#2ecc71",
  "#e74c3c",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#34495e",
];

const getUserAvatar = (user) => {
  if (
    user &&
    user.avatar &&
    user.avatar !== "null" &&
    user.avatar !== "undefined"
  ) {
    return user.avatar;
  }
  let initials = "UN";
  if (user) {
    const firstName = user.firstName || (user.user && user.user.firstName);
    const lastName = user.lastName || (user.user && user.user.lastName);
    const username = user.username || (user.user && user.user.username);
    const email = user.email || (user.user && user.user.email);
    if (firstName && lastName) initials = `${firstName[0]}${lastName[0]}`;
    else if (username) initials = username.substring(0, 2).toUpperCase();
    else if (email) initials = email.substring(0, 2).toUpperCase();
  }
  const userId = (user && (user._id || (user.user && user.user._id))) || "";
  const colorIndex =
    (userId.toString().charCodeAt(0) || 0) % avatarColors.length;
  const bgColor = avatarColors[colorIndex];
  return `https://ui-avatars.com/api/?name=${initials}&background=${bgColor.replace(
    "#",
    ""
  )}&color=fff&bold=true&size=128`;
};

const ProjectInfo = ({
  boardName,
  boardDescription,
  boardId,
  onListRestored,
  onCardRestored,
  boardCreatedAt,
  members: initialMembers,
  onBoardDataUpdate,
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
  const [members, setMembers] = useState(initialMembers || []);
  const [loadingMembers, setLoadingMembers] = useState(!initialMembers);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic date formatting
  const formatDate = () => {
    const date = boardCreatedAt ? new Date(boardCreatedAt) : new Date();
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "long" });
    return `${day} ${month}`;
  };

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

  // Update members when prop changes
  useEffect(() => {
    if (initialMembers) {
      setMembers(initialMembers);
      setLoadingMembers(false);
    }
  }, [initialMembers]);

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
      const textarea = descriptionTextareaRef.current;
      textarea.focus();
      // Move cursor to the end of the text
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
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
  const handleDeleteBoard = () => {
    setShowDeleteConfirm(true);
    setShowDropdown(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`${BASE_URL}/api/v1/boards/user-boards/${boardId}`, {
        withCredentials: true,
      });
      navigate("/main/dashboard");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error deleting board:", error);
      setShowErrorAlert("Failed to delete board.");
      setTimeout(() => setShowErrorAlert(null), 4000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Handle save changes
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Check if there are any changes
    if (
      form.name === (boardName || "Project Name") &&
      form.description === (boardDescription || "")
    ) {
      setEditingName(false);
      setEditingDescription(false);
      setSaving(false);
      return; // No changes, exit early
    }

    // Validate inputs
    if (!form.name || form.name.trim() === "") {
      const errorMsg = "Board name is required and cannot be empty";
      setShowErrorAlert(errorMsg);
      setTimeout(() => setShowErrorAlert(null), 4000);
      setSaving(false);
      return;
    }

    if (form.name.trim().length > 100) {
      const errorMsg = "Board name cannot exceed 100 characters";
      setShowErrorAlert(errorMsg);
      setTimeout(() => setShowErrorAlert(null), 4000);
      setSaving(false);
      return;
    }

    if (form.description && form.description.length > 500) {
      const errorMsg = "Board description cannot exceed 500 characters";
      setShowErrorAlert(errorMsg);
      setTimeout(() => setShowErrorAlert(null), 4000);
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/boards/user-boards/${boardId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, create a generic error object
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        // Create an error object that matches our error handler format
        const error = {
          response: {
            status: response.status,
            data: errorData,
          },
          message:
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        };

        const errorMessage = getBoardErrorMessage(error, "board_info");
        logBoardError(error, "updateBoardInfo", {
          boardId,
          updateData: { name: form.name, description: form.description },
        });

        setShowErrorAlert(errorMessage);
        setTimeout(() => setShowErrorAlert(null), 5000);
        throw new Error(errorMessage);
      }

      // Call the callback to update parent component with new data
      if (onBoardDataUpdate) {
        onBoardDataUpdate({
          name: form.name.trim(),
          description: form.description.trim(),
        });
      }

      // Dispatch custom event to notify other components (like Breadcrumb) of the board update
      const boardUpdatedEvent = new CustomEvent("boardUpdated", {
        detail: {
          boardId: boardId,
          name: form.name.trim(),
          description: form.description.trim(),
        },
      });
      window.dispatchEvent(boardUpdatedEvent);

      setEditingName(false);
      setEditingDescription(false);

      // Show success feedback
      toast.success("Board information updated successfully!", {
        duration: 3000,
        position: "top-right",
      });
    } catch (err) {
      // Error already handled above, but catch any unexpected errors
      if (!showErrorAlert) {
        const fallbackMessage =
          "An unexpected error occurred while updating the board";
        setShowErrorAlert(fallbackMessage);
        setTimeout(() => setShowErrorAlert(null), 4000);
      }
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
        <div className="flex flex-row justify-between items-start gap-4">
          <div className="flex-1">
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
                className="text-xl font-semibold border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-0.5 focus:ring-[#6a3b82]"
                placeholder="Project Name"
              />
            ) : (
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                {form.name}
                <Edit
                  size={20}
                  className="text-gray-400 hover:text-[#6a3b82]"
                  onClick={toggleEditName}
                />
              </h1>
            )}
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Calendar size={16} className="text-gray-400" />
              {formatDate()}
            </p>
          </div>

          <div
            className="flex items-center gap-5 mt-4 lg:mt-0 lg:ms-auto relative"
            ref={dropdownRef}
          >
            <div className="flex items-center gap-2 cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 16 16"
                onClick={() => setShowInvitePopup(true)}
              >
                <path
                  fill="#4D2D61"
                  d="M7.5 2a.5.5 0 0 1 0 1h-3A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 1 1 0v2a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7A2.5 2.5 0 0 1 4.5 2zm3.28-.95a.5.5 0 0 1 .527.055l4.5 3.5a.5.5 0 0 1 0 .79l-4.5 3.5A.5.5 0 0 1 10.5 8.5V7.025c-2.232.23-3.624 1.973-4.396 3.399l-.157.3A.5.5 0 0 1 5 10.5c0-2.076.518-3.941 1.537-5.3c.938-1.25 2.286-2.047 3.963-2.179V1.5a.5.5 0 0 1 .28-.45m.72 2.45a.5.5 0 0 1-.5.5c-1.59 0-2.817.673-3.662 1.8c-.537.716-.928 1.626-1.144 2.68C7.222 7.198 8.775 6 11 6a.5.5 0 0 1 .5.5v.978L14.685 5L11.5 2.521z"
                />
              </svg>
              <MoreHorizontal
                size={24}
                className="text-[#4D2D61] cursor-pointer"
                onClick={() => setShowDropdown((prev) => !prev)}
              />
            </div>

            {showDropdown && (
              <div className="absolute top-7 right-0 bg-white border border-gray-300 rounded-md shadow-md z-10 ">
                <ul className="text-sm text-gray-700">
                  <li
                    onClick={handleArchivedClick}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
                  >
                    Archived Items
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

        <div className="flex flex-row lg:justify-between lg:items-center mt-4 gap-4">
          {editingDescription ? (
            <div className="flex items-center gap-2 flex-1">
              <textarea
                ref={descriptionTextareaRef}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                onBlur={handleDescriptionBlur}
                onKeyDown={handleDescriptionKeyDown}
                className="w-full text-md text-gray-700 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-0.5 focus:ring-[#6a3b82] transition-all duration-200 resize-vertical"
                rows={2}
                placeholder="Add a board description"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <p className="text-gray-600 text-md">
                {form.description || "No description available"}
              </p>
              <Edit
                size={16}
                className="text-gray-400 hover:text-[#6a3b82]"
                onClick={toggleEditDescription}
              />
            </div>
          )}

          <div className="flex items-center gap-3 lg:ml-4">
            <div className="flex -space-x-2">
              {membersArray.slice(0, 5).map((member) => (
                <UserAvatar
                  key={member.id}
                  user={member.user}
                  className="h-8 w-8 border-2 border-white"
                />
              ))}
              {membersArray.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 border-2 border-white">
                  +{membersArray.length - 5}
                </div>
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
            onCardRestored={onCardRestored}
          />
        )}
        {showSettingsPopup && (
          <SettingsPopup
            onClose={() => setShowSettingsPopup(false)}
            boardId={boardId}
          />
        )}
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Board"
          itemName={boardName || "Project Name"}
          itemType="board"
          confirmText="Delete Board"
          cancelText="Cancel"
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default ProjectInfo;
