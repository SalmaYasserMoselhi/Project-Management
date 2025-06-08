"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Edit, ChevronDown, Menu, Clock, Users, Bell, Shield, Save } from "lucide-react"
import MembersModal from "../Components/MembersModal"
import Breadcrumb from "../Components/Breadcrumb"

const permissionOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "All members" },
]

export default function WorkspaceSettings() {
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    inviteRestriction: 'owner',
    boardCreation: 'admin',
    notificationsEnabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState(false)
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const inviteDropdownRef = useRef(null)
  const boardDropdownRef = useRef(null)
  const nameInputRef = useRef(null)
  const membersScrollRef = useRef(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [errorMembers, setErrorMembers] = useState(null)

  // Get workspaceId from localStorage
  const workspaceId = useMemo(() => {
    try {
      // Prefer selectedPublicWorkspace if available
      const publicSelected = localStorage.getItem('selectedPublicWorkspace');
      if (publicSelected) {
        const parsed = JSON.parse(publicSelected);
        return parsed?._id || parsed?.id || null;
      }
      // Fallback to selectedWorkspace
      const selected = localStorage.getItem('selectedWorkspace');
      if (!selected) return null;
      const parsed = JSON.parse(selected);
      return parsed?._id || parsed?.id || null;
    } catch {
      return null;
    }
  }, []);

  // Fetch workspace data
  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!workspaceId) {
        setError('No workspace selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch workspace details
        const workspaceRes = await fetch(`/api/v1/workspaces/${workspaceId}`);
        if (!workspaceRes.ok) throw new Error('Failed to fetch workspace');
        const workspaceData = await workspaceRes.json();
        
        // Fetch workspace members
        const membersRes = await fetch(`/api/v1/workspaces/${workspaceId}/members`);
        if (!membersRes.ok) throw new Error('Failed to fetch members');
        const membersData = await membersRes.json();

        const workspaceInfo = workspaceData.data.workspace;
        
        // Ensure members is an array and transform the data
        const membersArray = Array.isArray(membersData.data.members) 
          ? membersData.data.members 
          : Array.isArray(membersData.members) 
            ? membersData.members 
            : [];
        
        // Update workspace state with fetched data
        setWorkspace({
          ...workspaceInfo,
          members: membersArray.map(m => ({
            ...m,
            id: m._id || m.id,
            name: m.user?.username || m.user?.email || "Unknown",
            avatar: m.user?.avatar,
            email: m.user?.email
          }))
        });

        // Update form state
        setForm({
          name: workspaceInfo.name,
          description: workspaceInfo.description,
          inviteRestriction: workspaceInfo.settings?.inviteRestriction || 'owner',
          boardCreation: workspaceInfo.settings?.boardCreation || 'admin',
          notificationsEnabled: workspaceInfo.settings?.notificationsEnabled ?? true,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [editingName])

  useEffect(() => {
    function handleClickOutside(event) {
      if (inviteDropdownRef.current && !inviteDropdownRef.current.contains(event.target)) {
        setInviteDropdownOpen(false)
      }
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(event.target)) {
        setBoardDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          settings: {
            inviteRestriction: form.inviteRestriction,
            boardCreation: form.boardCreation,
            notificationsEnabled: form.notificationsEnabled,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workspace');
      }

      const data = await response.json();
      setWorkspace(prev => ({
        ...prev,
        ...data.data.workspace,
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEditName = () => setEditingName((v) => !v)
  const handleNameBlur = () => setEditingName(false)
  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") setEditingName(false)
  }

  const updateDropdownPosition = () => {
    if (roleDropdownOpen !== null) {
      const btn = document.getElementById(`role-dropdown-btn-${roleDropdownOpen}`);
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

  // Lighter purple for open border
  const openBorder = "border-[#D6C3EA]"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F5F7]">
        <div className="animate-spin h-8 w-8 border-t-2 border-[#6A3B82] rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F5F7]">
        <div className="text-red-500 text-center">
          <p className="text-lg font-medium mb-2">Error loading workspace</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F5F7]">
        <div className="text-gray-500 text-center">
          <p className="text-lg font-medium">No workspace selected</p>
          <p className="text-sm">Please select a workspace to view its settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Header */}
      <div className="p-3 md:p-4 flex items-center">
        {isMobile && (
          <button className="mr-2 p-1 rounded-md">
            <Menu size={24} className="text-[#57356A]" />
          </button>
        )}
        <Breadcrumb customLabel="Workspace Settings" />
      </div>

      <div className="flex flex-col space-y-4 mx-auto px-3">
        {/* Success Message */}
        {success && (
          <div className="border border-green-200 bg-green-50 rounded-lg shadow-sm">
            <div className="p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Settings saved successfully!</span>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Overview */}
        <div className="border border-purple-200 rounded-lg shadow-sm bg-white">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[#6A3B82] to-[#57356A] text-white font-semibold rounded-xl text-xl shadow-lg">
                {form.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                {editingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    className="text-xl font-semibold border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-0.5 focus:ring-[#6A3B82] bg-white text-[#6A3B82]"
                    style={{ minWidth: 180 }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-[#6A3B82]">{form.name}</h1>
                    <button className="ml-2 text-gray-400 hover:text-[#6A3B82]" onClick={toggleEditName}>
                      <Edit size={18} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-purple-100 text-[#6A3B82] text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {workspace.type}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Users size={14} />
                    {workspace.members.length} members
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-0.5 focus:ring-[#6A3B82] focus:text-gray-700 min-h-[80px]"
                  rows={2}
                  placeholder="Add a workspace description"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Members Section and Permissions Side by Side */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Members Section */}
          <div className="border border-purple-200 rounded-lg shadow-sm bg-white">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#6A3B82] flex items-center gap-2">
                    <Users size={20} />
                    Workspace Members
                  </h2>
                  <p className="text-sm text-gray-500">Manage who has access to this workspace</p>
                </div>
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="px-3 py-1 text-sm border border-[#6A3B82] text-[#6A3B82] rounded-lg hover:bg-purple-50 flex items-center gap-1"
                >
                  <Shield size={16} />
                  Manage
                </button>
              </div>
              <div className="flex items-center -space-x-2">
                {Array.isArray(workspace?.members) && workspace.members.slice(0, 5).map((member, index) => (
                  <div
                    key={member.id}
                    className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center overflow-hidden"
                    style={{ background: (member.avatar && member.avatar !== "null" && member.avatar !== "undefined" && member.avatar !== "") ? undefined : '#4D2D61' }}
                  >
                    {member.avatar && member.avatar !== "null" && member.avatar !== "undefined" && member.avatar !== "" ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-white">
                        {(member.name?.charAt(0).toUpperCase() || member.user?.username?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase() || "?")}
                      </span>
                    )}
                  </div>
                ))}
                {Array.isArray(workspace?.members) && workspace.members.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600">
                    +{workspace.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="border border-purple-200 rounded-lg shadow-sm bg-white">
            <div className="p-4 md:p-6">
              <h2 className="text-lg font-semibold text-[#6A3B82] flex items-center gap-2 mb-1">
                <Shield size={20} />
                Permissions
              </h2>
              <p className="text-sm text-gray-500 mb-4">Control who can perform actions in this workspace</p>
              <div className="space-y-3">
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-sm font-medium text-gray-700 min-w-[140px]">Member Invitation</div>
                  <div className="relative" ref={inviteDropdownRef}>
                    <button
                      type="button"
                      className={`w-36 flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none ${inviteDropdownOpen ? openBorder : "border-[#BFA8D9] hover:border-[#6A3B82]"} ${!inviteDropdownOpen ? "focus:border-[#BFA8D9]" : ""}`}
                      onClick={() => setInviteDropdownOpen((v) => !v)}
                    >
                      <span className="truncate text-gray-900">
                        {permissionOptions.find((opt) => opt.value === form.inviteRestriction)?.label || "Select"}
                      </span>
                      <ChevronDown
                        className={`ml-2 transition-transform ${inviteDropdownOpen ? "rotate-180" : ""} text-gray-400`}
                        size={18}
                      />
                    </button>
                    {inviteDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-20 animate-fade-in">
                        {permissionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${form.inviteRestriction === opt.value ? "bg-[#F3EFFF] font-semibold text-[#6A3B82]" : ""}`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, inviteRestriction: opt.value }))
                              setInviteDropdownOpen(false)
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <div className="text-sm font-medium text-gray-700 min-w-[140px]">Boards Management</div>
                  <div className="relative" ref={boardDropdownRef}>
                    <button
                      type="button"
                      className={`w-36 flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none ${boardDropdownOpen ? openBorder : "border-[#BFA8D9] hover:border-[#6A3B82]"} ${!boardDropdownOpen ? "focus:border-[#BFA8D9]" : ""}`}
                      onClick={() => setBoardDropdownOpen((v) => !v)}
                    >
                      <span className="truncate text-gray-900">
                        {permissionOptions.find((opt) => opt.value === form.boardCreation)?.label || "Select"}
                      </span>
                      <ChevronDown
                        className={`ml-2 transition-transform ${boardDropdownOpen ? "rotate-180" : ""} text-gray-400`}
                        size={18}
                      />
                    </button>
                    {boardDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-20 animate-fade-in">
                        {permissionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${form.boardCreation === opt.value ? "bg-[#F3EFFF] font-semibold text-[#6A3B82]" : ""}`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, boardCreation: opt.value }))
                              setBoardDropdownOpen(false)
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Overview */}
        <div className="border border-purple-200 rounded-lg shadow-sm bg-white">
          <div className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-[#6A3B82] flex items-center gap-2 mb-1">
              <Clock size={20} />
              Recent Activity
            </h2>
            <p className="text-sm text-gray-500 mb-4">Latest workspace activity and changes</p>
            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {[
                { user: "Jane Cooper", action: "updated board permissions", time: "2 hours ago" },
                { user: "John Doe", action: "invited new member", time: "5 hours ago" },
                { user: "Sarah Wilson", action: "created new board", time: "1 day ago" },
                { user: "Michael Smith", action: "archived a board", time: "2 days ago" },
                { user: "Emily Clark", action: "added a new task", time: "3 days ago" },
                { user: "David Lee", action: "commented on a card", time: "4 days ago" },
                { user: "Anna Kim", action: "changed board background", time: "5 days ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {activity.user.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center mb-4"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add MembersModal */}
      <MembersModal
        open={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        members={workspace.members}
        setMembers={(newMembers) => setWorkspace(prev => ({ ...prev, members: newMembers }))}
        roleDropdownOpen={roleDropdownOpen}
        setRoleDropdownOpen={setRoleDropdownOpen}
        dropdownPos={dropdownPos}
        setDropdownPos={setDropdownPos}
        updateDropdownPosition={updateDropdownPosition}
        membersScrollRef={membersScrollRef}
        entityId={workspace.id}
        entityType="workspace"
        loadingMembers={loadingMembers}
        setLoadingMembers={setLoadingMembers}
        errorMembers={errorMembers}
        setErrorMembers={setErrorMembers}
      />
    </div>
  )
}
