"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Edit, ChevronDown, Lock, Star, Globe, Trash2, AlertCircle, Menu, X, Settings as Gear } from "lucide-react"
import { Fragment } from "react"
import Breadcrumb from "../Components/Breadcrumb"
import Avatar1 from '../assets/Avatar1.png';
import Avatar2 from '../assets/Avatar2.png';
import Avatar3 from '../assets/Avatar3.png';
import Avatar4 from '../assets/Avatar4.png';
import defaultAvatar from '../assets/defaultAvatar.png';
import ReactDOM from 'react-dom';
import MembersModal from '../Components/MembersModal';

const mockWorkspace = {
  name: "Samaa's Workspace",
  description:
    "A inventore reiciendis id nemo quo. Voluptatibus rerum fugit explicabo hic aperiam. Veritatis quos aut vero eum omnis.",
  type: "private",
  members: [
    { id: 1, avatar: Avatar1, name: "User 1", role: "owner" },
    { id: 2, avatar: Avatar2, name: "User 2", role: "admin" },
    { id: 3, avatar: Avatar3, name: "User 3", role: "member" },
    { id: 4, avatar: Avatar4, name: "User 4", role: "member" },
    { id: 5, avatar: defaultAvatar, name: "User 5", role: "member" },
    { id: 6, avatar: defaultAvatar, name: "User 6", role: "member" },
  ],
  settings: {
    inviteRestriction: "owner",
    boardCreation: "admin",
    notificationsEnabled: true,
  },
}

const whoOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "All members" },
]

function WorkspaceSettings() {
  // عرف الدالة هنا أولاً
  const getSelectedPublicWorkspaceId = () => {
    try {
      const selected = localStorage.getItem('selectedPublicWorkspace');
      if (!selected) return null;
      const parsed = JSON.parse(selected);
      return parsed?._id || parsed?.id || null;
    } catch {
      return null;
    }
  };

  const [workspace, setWorkspace] = useState(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    inviteRestriction: [],
    boardCreation: [],
    notificationsEnabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const nameInputRef = useRef(null)
  const navigate = useNavigate()
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState(false)
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false)
  const inviteDropdownRef = useRef(null)
  const boardDropdownRef = useRef(null)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(null)
  const [membersState, setMembersState] = useState([])
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const dropdownBtnRef = useRef();
  const membersScrollRef = useRef(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorMembers, setErrorMembers] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(getSelectedPublicWorkspaceId());

  // Lighter purple for open border
  const openBorder = 'border-[#D6C3EA]';

  useEffect(() => {
    // Check if mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    checkIfMobile()

    // Add event listener
    window.addEventListener("resize", checkIfMobile)

    // Replace with real API call
    setWorkspace(mockWorkspace)
    setForm({
      name: mockWorkspace.name,
      description: mockWorkspace.description,
      inviteRestriction: [mockWorkspace.settings.inviteRestriction],
      boardCreation: [mockWorkspace.settings.boardCreation],
      notificationsEnabled: mockWorkspace.settings.notificationsEnabled,
    })

    // Clean up
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
      // Close role dropdown if click outside
      if (roleDropdownOpen !== null) {
        const dropdown = document.getElementById(`role-dropdown-${roleDropdownOpen}`);
        if (dropdown && !dropdown.contains(event.target)) {
          setRoleDropdownOpen(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [roleDropdownOpen])

  useEffect(() => {
    if (roleDropdownOpen !== null && dropdownBtnRef.current) {
      const rect = dropdownBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  }, [roleDropdownOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === "checkbox") {
      setForm((prev) => {
        const arr = prev[name]
        if (checked) {
          return { ...prev, [name]: [...arr, value] }
        } else {
          return { ...prev, [name]: arr.filter((v) => v !== value) }
        }
      })
    } else if (type === "radio") {
      setForm((prev) => ({ ...prev, [name]: value }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }, 1200)
  }

  const toggleEditName = () => setEditingName((v) => !v)
  const handleNameBlur = () => setEditingName(false)
  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") setEditingName(false)
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  // Members display logic
  const maxAvatars = 5
  const members = membersState
  const extraCount = members.length - maxAvatars

  // 1. دالة لحساب position الزر
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

  useEffect(() => {
    window.addEventListener('scroll', updateDropdownPosition, true);
    document.addEventListener('scroll', updateDropdownPosition, true);
    if (membersScrollRef.current) {
      membersScrollRef.current.addEventListener('scroll', updateDropdownPosition, true);
    }
  }, [roleDropdownOpen]);

  useEffect(() => {
    setWorkspaceId(getSelectedPublicWorkspaceId());
  }, []);

  useEffect(() => {
    if (workspaceId) {
      setLoadingMembers(true);
      setErrorMembers(null);
      const url = `/api/v1/workspaces/${workspaceId}/members`;
      console.log('Fetching members from:', url);
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch members');
          return res.json();
        })
        .then(data => {
          setMembersState(data.data?.members || data.members || []);
        })
        .catch(err => setErrorMembers(err.message))
        .finally(() => setLoadingMembers(false));
    }
  }, [workspaceId]);

  useEffect(() => {
    console.log('workspaceId:', workspaceId);
  }, [workspaceId]);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1E1E2E]">
        <div className="animate-spin h-8 w-8 border-t-2 border-purple-600 rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F5F7]">
      <div className="p-3 md:p-4 flex items-center">
        <Breadcrumb customLabel="Workspace Settings" />
      </div>
      <div className="w-full px-3 md:px-4">
        {/* Header: Avatar, Name, Edit */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-12 flex items-center justify-center bg-[#6A3B82] text-white font-normal rounded-lg text-lg">
            {form.name.charAt(0).toUpperCase()}
          </div>
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="text-lg font-normal border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-0.5 focus:ring-[#6A3B82] bg-white text-[#6A3B82]"
              style={{ minWidth: 180 }}
            />
          ) : (
            <h1 className="text-lg font-medium flex items-center text-[#6A3B82]">
              {form.name}
              <button className="ml-2 text-gray-400 hover:text-[#6A3B82]" onClick={toggleEditName}>
                <Edit size={18} />
              </button>
            </h1>
          )}
        </div>
        <hr className="my-4 border-gray-200" />

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-0.5 focus:ring-[#6A3B82] focus:text-gray-700"
            rows={2}
            placeholder="Add a workspace description"
          />
        </div>

        {/* Workspace members */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">Workspace members</span>
            <button
              className="ml-1 w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 transition"
              onClick={() => setShowMembersModal(true)}
              aria-label="Manage members"
            >
              <Gear size={16} className="text-gray-400" />
            </button>
          </div>
          <div className="flex items-center">
            {membersState.slice(0, 4).map((m, i) => (
              <img
                key={m._id}
                src={m.user?.avatar || defaultAvatar}
                alt={m.user?.username || m.user?.email || 'User'}
                className={`h-10 w-10 rounded-full object-cover ${i !== 0 ? '-ml-4' : ''}`}
                style={{ zIndex: i + 1 }}
              />
            ))}
            {membersState.length > 4 && (
              <span className="-ml-4 h-10 w-10 flex items-center justify-center rounded-full bg-[#F5F5F7] text-gray-500 text-base font-bold" style={{ zIndex: membersState.slice(0, 4).length + 2 }}>
                +{membersState.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Members Modal Popup */}
        {showMembersModal && (
          <MembersModal
            open={showMembersModal}
            onClose={() => setShowMembersModal(false)}
            members={membersState}
            setMembers={setMembersState}
            roleDropdownOpen={roleDropdownOpen}
            setRoleDropdownOpen={setRoleDropdownOpen}
            dropdownPos={dropdownPos}
            setDropdownPos={setDropdownPos}
            updateDropdownPosition={updateDropdownPosition}
            membersScrollRef={membersScrollRef}
            entityId={workspaceId}
            entityType="workspace"
            loadingMembers={loadingMembers}
            errorMembers={errorMembers}
            setLoadingMembers={setLoadingMembers}
            setErrorMembers={setErrorMembers}
          />
        )}

        {/* Notifications */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900 mb-1">Notifications</div>
            <div className="text-gray-500 text-sm max-w-xl">
              Receive notifications for all activities in this workspace.
            </div>
          </div>
          <button
            onClick={() => setForm((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
            type="button"
            aria-pressed={form.notificationsEnabled}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${form.notificationsEnabled ? "bg-[#57356A]" : "bg-gray-300"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${form.notificationsEnabled ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>

        {/* Who can */}
        <div className="mb-4">
          <div className="font-medium text-gray-900 mb-2">Restrictions</div>
          <div className="flex flex-col gap-4">
            {/* Invite members */}
            <div className="flex items-center gap-3">
              <div className="mb-0 text-gray-800 whitespace-nowrap">Member Invitation</div>
              <div className="relative w-40" ref={inviteDropdownRef}>
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none ${inviteDropdownOpen ? openBorder : 'border-[#BFA8D9] hover:border-[#6A3B82]'} ${!inviteDropdownOpen ? 'focus:border-[#BFA8D9]' : ''}`}
                  onClick={() => setInviteDropdownOpen((v) => !v)}
                >
                  <span className="truncate text-gray-900">{whoOptions.find(opt => opt.value === form.inviteRestriction[0])?.label || 'Select'}</span>
                  <ChevronDown className={`ml-2 transition-transform ${inviteDropdownOpen ? 'rotate-180' : ''} text-gray-400`} size={18} />
                </button>
                {inviteDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-20 animate-fade-in">
                    {whoOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${form.inviteRestriction[0] === opt.value ? 'font-semibold text-[#6A3B82]' : ''}`}
                        onClick={() => {
                          setForm(prev => ({ ...prev, inviteRestriction: [opt.value] }))
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
            {/* Manage boards */}
            <div className="flex items-center gap-3">
              <div className="mb-0 text-gray-800 whitespace-nowrap">Boards Management</div>
              <div className="relative w-40" ref={boardDropdownRef}>
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none ${boardDropdownOpen ? openBorder : 'border-[#BFA8D9] hover:border-[#6A3B82]'} ${!boardDropdownOpen ? 'focus:border-[#BFA8D9]' : ''}`}
                  onClick={() => setBoardDropdownOpen((v) => !v)}
                >
                  <span className="truncate text-gray-900">{whoOptions.find(opt => opt.value === form.boardCreation[0])?.label || 'Select'}</span>
                  <ChevronDown className={`ml-2 transition-transform ${boardDropdownOpen ? 'rotate-180' : ''} text-gray-400`} size={18} />
                </button>
                {boardDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-20 animate-fade-in">
                    {whoOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${form.boardCreation[0] === opt.value ? 'font-semibold text-[#6A3B82]' : ''}`}
                        onClick={() => {
                          setForm(prev => ({ ...prev, boardCreation: [opt.value] }))
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
        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkspaceSettings;
