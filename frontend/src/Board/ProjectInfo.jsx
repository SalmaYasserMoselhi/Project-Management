"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import CalendarBlank from "../assets/CalendarBlank.png";
import edit from "../assets/edit.png";
import share from "../assets/share.png";
import { useSelector } from "react-redux";
import { ChevronDown, Settings } from "lucide-react";
import ReactDOM from "react-dom";
import ShareModal from "./ShareModal";
import ArchivedPopup from "./ArchivedPopup";
import SettingsPopup from "./SettingsPopup";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import InviteMembersPopup from "../Components/InviteMembersPopup";

const ProjectInfo = ({
  boardName,
  boardDescription,
  boardId,
  onListRestored,
}) => {
  const BASE_URL = "http://localhost:3000";
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const currentUser = useSelector((state) => state.login.user);
  const [showToast, setShowToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const membersScrollRef = useRef(null);
  const observerRef = useRef(null);

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

  // Intersection Observer for dropdown visibility
  useEffect(() => {
    if (roleDropdownOpen !== null && membersScrollRef.current) {
      const btn = document.getElementById(
        `role-dropdown-btn-${roleDropdownOpen}`
      );
      if (!btn) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new window.IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            setRoleDropdownOpen(null);
          }
        },
        {
          root: membersScrollRef.current,
          threshold: 0.01,
        }
      );
      observerRef.current.observe(btn);
      return () => {
        if (observerRef.current) observerRef.current.disconnect();
      };
    } else {
      if (observerRef.current) observerRef.current.disconnect();
    }
  }, [roleDropdownOpen]);

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

  // Fetch members after role change or removal
  const fetchMembers = () => {
    setIsRefreshingMembers(true);
    const url = `${BASE_URL}/api/v1/boards/${boardId}/members`;
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch members");
        return res.json();
      })
      .then((data) => {
        const members = (data.data?.members || data.members || []).map((m) => ({
          ...m,
          id: m.id || m._id,
          name: m.user?.username || m.user?.email || "Unknown",
          avatar: m.user?.avatar,
          email: m.user?.email,
        }));
        setMembers(members);
      })
      .catch((err) => setErrorMembers(err.message))
      .finally(() => setIsRefreshingMembers(false));
  };

  // Auto-dismiss error alert
  useEffect(() => {
    if (showErrorAlert && errorMembers) {
      const timeout = setTimeout(() => {
        setShowErrorAlert(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [showErrorAlert, errorMembers]);

  // Handle member removal
  const handleRemoveMember = async (memberId, userId) => {
    try {
      setIsRefreshingMembers(true);
      const url = `${BASE_URL}/api/v1/boards/${boardId}/members/${userId}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        let msg = "Failed to remove member";
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }
      if (currentUser && userId === currentUser._id) {
        navigate("/main/dashboard");
        return;
      }
      fetchMembers();
    } catch (err) {
      setErrorMembers(err.message || "Failed to remove member");
      setShowErrorAlert(true);
    } finally {
      setIsRefreshingMembers(false);
    }
  };

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
      alert("Failed to delete board.");
    }
  };

  return (
    <>
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md z-50">
          Board deleted successfully!
        </div>
      )}

      {showMembersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1E2E]/30"
          onClick={() => setShowMembersModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {showErrorAlert && errorMembers && (
              <div className="mb-3 px-4 py-2 bg-red-100 border border-red-300 text-red-700 rounded-lg text-center font-medium">
                {errorMembers}
              </div>
            )}
            {successMessage && (
              <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-center font-medium">
                {successMessage}
              </div>
            )}
            <div className="mb-2 text-gray-700 text-sm font-medium">
              People with access ({membersArray.length})
            </div>
            <div
              ref={membersScrollRef}
              className="space-y-2 max-h-60 overflow-y-auto pr-1"
            >
              {loadingMembers || isRefreshingMembers ? (
                <div className="text-center py-8 text-gray-400">
                  Loading members...
                </div>
              ) : membersArray.length === 0 ? (
                errorMembers ? null : (
                  <div className="text-center py-8 text-gray-400">
                    No members found.
                  </div>
                )
              ) : (
                <>
                  {membersArray.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      {m.avatar || m.user?.avatar ? (
                        <img
                          src={m.avatar || m.user?.avatar}
                          alt={m.name || m.user?.username}
                          className="h-8 w-8 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 shadow-md">
                          {m.name?.charAt(0).toUpperCase() ||
                            m.user?.username?.charAt(0).toUpperCase() ||
                            m.user?.email?.charAt(0).toUpperCase() ||
                            "?"}
                        </div>
                      )}
                      <span className="flex-1 text-gray-900 text-sm">
                        {m.name || m.user?.username}
                      </span>
                      {updatingRoleId === m.id || isRefreshingMembers ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#6a3b82] rounded-full animate-spin align-middle ml-2"></span>
                      ) : null}
                      {m.role?.toLowerCase() === "owner" ? (
                        <div className="w-24 py-1 px-4 rounded-lg border border-[#BFA8D9] text-[#6a3b82] text-sm font-semibold flex items-center justify-center bg-white ml-2">
                          Owner
                        </div>
                      ) : (
                        <>
                          <div
                            className="relative w-28"
                            id={`role-dropdown-${m.id}`}
                          >
                            <button
                              id={`role-dropdown-btn-${m.id}`}
                              type="button"
                              className={`w-full flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none border-[#BFA8D9] hover:border-[#6a3b82] focus:border-[#BFA8D9]`}
                              onClick={(e) => {
                                if (roleDropdownOpen === m.id) {
                                  setRoleDropdownOpen(null);
                                  window.removeEventListener(
                                    "scroll",
                                    updateDropdownPosition,
                                    true
                                  );
                                  if (membersScrollRef.current) {
                                    membersScrollRef.current.removeEventListener(
                                      "scroll",
                                      updateDropdownPosition,
                                      true
                                    );
                                  }
                                } else {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setDropdownPos({
                                    top: rect.bottom,
                                    left: rect.left,
                                    width: rect.width,
                                  });
                                  setRoleDropdownOpen(m.id);
                                  setTimeout(() => {
                                    window.addEventListener(
                                      "scroll",
                                      updateDropdownPosition,
                                      true
                                    );
                                    document.addEventListener(
                                      "scroll",
                                      updateDropdownPosition,
                                      true
                                    );
                                    if (membersScrollRef.current) {
                                      membersScrollRef.current.addEventListener(
                                        "scroll",
                                        updateDropdownPosition,
                                        true
                                      );
                                    }
                                  }, 0);
                                }
                              }}
                            >
                              <span className="text-gray-900">
                                {updatingRoleId === m.id ? (
                                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#6a3b82] rounded-full animate-spin align-middle"></span>
                                ) : (
                                  m.role
                                )}
                              </span>
                              <ChevronDown
                                className={`ml-2 transition-transform ${
                                  roleDropdownOpen === m.id ? "rotate-180" : ""
                                } text-gray-400`}
                                size={18}
                              />
                            </button>
                          </div>
                          <button
                            className="w-24 py-1 px-4 rounded-lg border border-red-200 text-red-500 text-sm font-medium transition-all duration-150 bg-white hover:border-red-400 hover:bg-red-50 focus:outline-none focus:border-red-400 focus:bg-red-50 ml-2"
                            aria-label={
                              currentUser && m.user?._id === currentUser._id
                                ? "Leave board"
                                : "Remove member"
                            }
                            onClick={() =>
                              handleRemoveMember(m.id, m.user?._id)
                            }
                          >
                            {currentUser && m.user?._id === currentUser._id
                              ? "Leave"
                              : "Remove"}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {roleDropdownOpen !== null &&
            ReactDOM.createPortal(
              <div
                className="bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-[9999] animate-fade-in"
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {["admin", "member"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${
                      membersArray
                        .find((mem) => mem.id === roleDropdownOpen)
                        ?.role?.toLowerCase() === opt
                        ? "font-semibold text-[#6a3b82]"
                        : ""
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={updatingRoleId === roleDropdownOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (updatingRoleId === roleDropdownOpen) return;
                      const memberId = roleDropdownOpen;
                      const newRole = opt;
                      const member = membersArray.find(
                        (mem) => mem.id === memberId
                      );
                      const userId = member?.user?._id;
                      if (
                        member?.role?.toLowerCase() === newRole.toLowerCase()
                      ) {
                        setRoleDropdownOpen(null);
                        return;
                      }
                      setUpdatingRoleId(memberId);
                      setMembers((prev) =>
                        prev.map((mem) =>
                          mem.id === memberId ? { ...mem, role: newRole } : mem
                        )
                      );
                      fetch(
                        `${BASE_URL}/api/v1/boards/user-boards/${boardId}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            members: [{ userId: userId, role: newRole }],
                          }),
                          credentials: "include",
                        }
                      )
                        .then(async (res) => {
                          if (!res.ok) {
                            let errorMsg = "Failed to update role";
                            try {
                              const data = await res.json();
                              if (data && data.message) errorMsg = data.message;
                            } catch {}
                            throw new Error(errorMsg);
                          }
                          return res.json();
                        })
                        .then(() => {
                          fetchMembers();
                          setSuccessMessage(
                            `Role updated to ${newRole} successfully`
                          );
                          setTimeout(() => setSuccessMessage(null), 4000);
                        })
                        .catch((err) => {
                          console.error(err);
                          setMembers((prev) =>
                            prev.map((mem) =>
                              mem.id === memberId
                                ? { ...mem, role: member?.role }
                                : mem
                            )
                          );
                          setErrorMembers(
                            err.message || "Failed to update role"
                          );
                          setShowErrorAlert(true);
                          fetchMembers();
                          setTimeout(() => setShowErrorAlert(false), 4000);
                        })
                        .finally(() => {
                          setUpdatingRoleId(null);
                          setRoleDropdownOpen(null);
                          window.removeEventListener(
                            "scroll",
                            updateDropdownPosition,
                            true
                          );
                          document.removeEventListener(
                            "scroll",
                            updateDropdownPosition,
                            true
                          );
                          if (membersScrollRef.current) {
                            membersScrollRef.current.removeEventListener(
                              "scroll",
                              updateDropdownPosition,
                              true
                            );
                          }
                        });
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>,
              document.body
            )}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm mb-2 mt-7 transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              {boardName || "Project Name"}
              <img
                src={edit || "/placeholder.svg"}
                alt="Edit"
                className="w-4 h-4 cursor-pointer ms-2"
              />
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
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
          <p className="text-gray-600 flex-1">{boardDescription || null}</p>

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
                  {membersArray.slice(0, 4).map((member, index) =>
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
