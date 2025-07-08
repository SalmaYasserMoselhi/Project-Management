import React, { useEffect, useRef, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { ChevronDown } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import {
  selectWorkspace,
  closeWorkspaceStart,
  setActiveWorkspaceType,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import {
  selectUserWorkspace,
  clearUserWorkspaces,
} from "../features/Slice/WorkspaceSlice/userWorkspacesSlice";
import { toast } from "react-toastify";

const MembersModal = ({
  open,
  onClose,
  members,
  setMembers,
  roleDropdownOpen,
  setRoleDropdownOpen,
  dropdownPos,
  setDropdownPos,
  updateDropdownPosition,
  membersScrollRef,
  entityId,
  entityType,
  loadingMembers = false,
  errorMembers = null,
  setLoadingMembers,
  setErrorMembers,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const observerRef = useRef(null);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);
  const currentUser = useSelector((state) => state.login.user);

  // Ensure members is always an array
  const membersArray = useMemo(() => {
    if (!members) return [];
    return Array.isArray(members) ? members : [];
  }, [members]);

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
  }, [roleDropdownOpen, setRoleDropdownOpen, membersScrollRef]);

  useEffect(() => {
    if (open && entityId && entityType) {
      setLoadingMembers(true);
      let url = "";
      if (entityType === "workspace") {
        url = `/api/v1/workspaces/${entityId}/members`;
      } else if (entityType === "board") {
        url = `/api/v1/boards/${entityId}/members`;
      }
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
  }, [open, entityId, entityType]);

  // دالة fetchMembers لجلب الأعضاء من السيرفر بعد نجاح التغيير
  const fetchMembers = () => {
    setIsRefreshingMembers(true);
    let url = "";
    if (entityType === "workspace") {
      url = `/api/v1/workspaces/${entityId}/members`;
    } else if (entityType === "board") {
      url = `/api/v1/boards/${entityId}/members`;
    }
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

  // إضافة useEffect لإعادة محاولة جلب الأعضاء تلقائيًا عند ظهور رسالة الخطأ
  useEffect(() => {
    if (showErrorAlert && errorMembers) {
      const timeout = setTimeout(() => {
        setShowErrorAlert(false);
      }, 5000); // 5 ثواني
      return () => clearTimeout(timeout);
    }
  }, [showErrorAlert, errorMembers]);

  // دالة حذف عضو
  const handleRemoveMember = (memberId, userId) => {
    setIsRefreshingMembers(true);
    const url =
      entityType === "workspace"
        ? `/api/v1/workspaces/${entityId}/members/${userId}`
        : `/api/v1/boards/${entityId}/members/${userId}`;

    fetch(url, {
      method: "DELETE",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "Failed to remove member");
          });
        }
        return res.text();
      })
      .then(async () => {
        if (currentUser && userId === currentUser._id) {
          // Current user is leaving the workspace
          if (entityType === "workspace") {
            // Clear localStorage for selected workspace
            localStorage.removeItem("selectedPublicWorkspace");

            // Close the workspace in sidebar
            dispatch(closeWorkspaceStart());

            // Clear workspace selection in sidebar
            dispatch(selectWorkspace(null));
            dispatch(setActiveWorkspaceType(null));

            // Clear user workspaces state
            dispatch(clearUserWorkspaces());

            // Automatically fetch and select user's public workspace
            try {
              const response = await fetch(
                "/api/v1/workspaces/user-workspaces",
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                }
              );

              if (response.ok) {
                const data = await response.json();
                const workspaces =
                  data?.data?.ownedWorkspaces || data?.data?.workspaces;

                if (workspaces && workspaces.length > 0) {
                  // Find the user's owned public workspace
                  const ownedPublicWorkspace = workspaces.find(
                    (ws) => ws.type === "public" && ws.userRole === "owner"
                  );

                  if (ownedPublicWorkspace) {
                    // Create workspace data object
                    const workspaceData = {
                      id: ownedPublicWorkspace._id,
                      name: ownedPublicWorkspace.name,
                      type: ownedPublicWorkspace.type,
                      description: ownedPublicWorkspace.description,
                      createdBy: ownedPublicWorkspace.createdBy,
                      userRole: ownedPublicWorkspace.userRole,
                      memberCount: ownedPublicWorkspace.memberCount,
                    };

                    // Save to localStorage
                    localStorage.setItem(
                      "selectedPublicWorkspace",
                      JSON.stringify(workspaceData)
                    );

                    // Update Redux state
                    dispatch(selectWorkspace(workspaceData));
                    dispatch(setActiveWorkspaceType("workspace"));
                    dispatch(selectUserWorkspace(workspaceData));
                  }
                }
              }
            } catch (error) {
              console.error(
                "Error fetching user workspaces after leaving:",
                error
              );
            }

            // Show success message
            toast.success("Successfully left the workspace");
          }

          // Close modal and navigate to dashboard
          onClose();
          navigate("/main/dashboard");
        } else {
          // Someone else was removed, just refresh the members list
          fetchMembers();
        }
      })
      .catch((err) => {
        setErrorMembers(err.message || "Failed to remove member");
        setShowErrorAlert(true);
      })
      .finally(() => {
        setIsRefreshingMembers(false);
      });
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1E2E]/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* رسالة الخطأ تظهر دائماً في أعلى البوب أب لمدة 5 ثواني */}
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
                  <UserAvatar user={m} className="h-8 w-8 shadow-md" />
                  <span className="flex-1 text-gray-900 text-sm">
                    {m.name || m.user?.username}
                  </span>
                  {m.role?.toLowerCase() === "owner" ? (
                    <div className="w-24 py-1 px-4 rounded-lg border border-[#6a3b82] text-[#6a3b82] text-sm font-semibold flex items-center justify-center bg-white ml-2">
                      Owner
                    </div>
                  ) : (
                    <>
                      <div
                        className="relative w-28"
                        id={`role-dropdown-${m.id}`}
                      >
                        {/* Show role dropdown only if the member is not the current user */}
                        {currentUser && m.user?._id === currentUser._id ? (
                          // Show role as text only for current user (non-editable)
                          <div className="w-full px-4 py-1 rounded-lg border border-gray-300 text-gray-600 text-sm bg-gray-100 flex items-center">
                            <span>{m.role}</span>
                          </div>
                        ) : (
                          (() => {
                            // Get current user's role to determine if they can edit roles
                            const currentUserMember = membersArray.find(
                              (member) => member.user?._id === currentUser?._id
                            );
                            const currentUserRole = currentUserMember?.role;

                            // Only owners can change admin roles, admins can only change member roles
                            const canEditThisRole =
                              currentUserRole === "owner" ||
                              (currentUserRole === "admin" &&
                                m.role !== "admin");

                            // Get available role options for this user
                            const availableRoles = [];
                            availableRoles.push("member"); // Always allow member
                            if (currentUserRole === "owner") {
                              availableRoles.push("admin"); // Only owners can assign admin
                            }

                            return canEditThisRole &&
                              availableRoles.length > 1 ? (
                              // Show editable dropdown for other users (only if multiple options)
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
                                    roleDropdownOpen === m.id
                                      ? "rotate-180"
                                      : ""
                                  } text-gray-400`}
                                  size={18}
                                />
                              </button>
                            ) : (
                              // Show non-editable role for single option or restricted users
                              <div className="w-full px-4 py-1 rounded-lg border border-gray-300 text-gray-600 text-sm bg-gray-100 flex items-center">
                                <span>{m.role}</span>
                                {!canEditThisRole}
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <button
                        className="w-24 py-1 px-4 rounded-lg border border-red-200 text-red-500 text-sm font-medium transition-all duration-150 bg-white hover:border-red-400 hover:bg-red-50 focus:outline-none focus:border-red-400 focus:bg-red-50 ml-2"
                        aria-label={
                          currentUser && m.user?._id === currentUser._id
                            ? "Leave workspace"
                            : "Remove member"
                        }
                        onClick={() => handleRemoveMember(m.id, m.user?._id)}
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
            {(() => {
              // Get current user's role in this workspace/board
              const currentUserMember = membersArray.find(
                (m) => m.user?._id === currentUser?._id
              );
              const currentUserRole = currentUserMember?.role;

              // Define available role options based on current user's role
              const availableRoles = [];

              // Always allow "member" role
              availableRoles.push("member");

              // Only workspace/board owners can assign admin roles
              if (currentUserRole === "owner") {
                availableRoles.push("admin");
              }

              return availableRoles.map((opt) => (
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
                    if (member?.role?.toLowerCase() === newRole.toLowerCase()) {
                      setRoleDropdownOpen(null);
                      return;
                    }
                    setUpdatingRoleId(memberId);
                    setMembers((prev) =>
                      prev.map((mem) =>
                        mem.id === memberId ? { ...mem, role: newRole } : mem
                      )
                    );

                    const updateUrl =
                      entityType === "board"
                        ? `/api/v1/boards/user-boards/${entityId}`
                        : `/api/v1/workspaces/${entityId}`;

                    const bodyPayload = {
                      members: [{ user: userId, role: newRole }],
                    };

                    fetch(updateUrl, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(bodyPayload),
                      credentials: "include",
                    })
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
                        setMembers((prev) =>
                          prev.map((mem) =>
                            mem.id === memberId
                              ? { ...mem, role: member?.role }
                              : mem
                          )
                        );
                        setErrorMembers(err.message || "Failed to update role");
                        setShowErrorAlert(true);
                        fetchMembers(); // يبدأ تحميل الميمبرز فوراً مع ظهور رسالة الخطأ
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
              ));
            })()}
          </div>,
          document.body
        )}
    </div>
  );
};

export default MembersModal;
