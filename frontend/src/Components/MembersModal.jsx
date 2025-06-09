import React, { useEffect, useRef, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';

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
  const observerRef = useRef(null);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Ensure members is always an array
  const membersArray = useMemo(() => {
    if (!members) return [];
    return Array.isArray(members) ? members : [];
  }, [members]);

  // Get workspaceId from localStorage if not provided
  const workspaceId = useMemo(() => {
    if (entityId) return entityId;
    try {
      const selected = localStorage.getItem('selectedWorkspace');
      if (!selected) return null;
      const parsed = JSON.parse(selected);
      return parsed?._id || parsed?.id || null;
    } catch {
      return null;
    }
  }, [entityId]);

  useEffect(() => {
    if (roleDropdownOpen !== null && membersScrollRef.current) {
      const btn = document.getElementById(`role-dropdown-btn-${roleDropdownOpen}`);
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
      setErrorMembers(null);
      let url = '';
      if (entityType === 'workspace') {
        url = `/api/v1/workspaces/${entityId}/members`;
      } else if (entityType === 'board') {
        url = `/api/v1/boards/${entityId}/members`;
      }
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch members');
          return res.json();
        })
        .then(data => {
          const members = (data.data?.members || data.members || []).map(m => ({
            ...m,
            id: m.id || m._id,
            name: m.user?.username || m.user?.email || "Unknown",
            avatar: m.user?.avatar,
            email: m.user?.email
          }));
          setMembers(members);
        })
        .catch(err => setErrorMembers(err.message))
        .finally(() => setLoadingMembers(false));
    }
  }, [open, entityId, entityType]);


  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1E2E]/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative" onClick={e => e.stopPropagation()}>
        {successMessage && (
          <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-center font-medium">
            {successMessage}
          </div>
        )}
        <div className="mb-2 text-gray-700 text-sm font-medium">People with access ({membersArray.length})</div>
        <div
          ref={membersScrollRef}
          className="space-y-2 max-h-60 overflow-y-auto pr-1"
        >
          {loadingMembers ? (
            <div className="text-center py-8 text-gray-400">Loading members...</div>
          ) : errorMembers ? (
            <div className="text-center py-8 text-red-500">{errorMembers}</div>
          ) : membersArray.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No members found.</div>
          ) : (
            membersArray.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                {m.avatar || m.user?.avatar ? (
                  <img src={m.avatar || m.user?.avatar} alt={m.name || m.user?.username} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(m.name?.charAt(0).toUpperCase() || m.user?.username?.charAt(0).toUpperCase() || m.user?.email?.charAt(0).toUpperCase() || "?")}
                  </div>
                )}
                <span className="flex-1 text-gray-900 text-sm">{m.name || m.user?.username}</span>
                {m.role?.toLowerCase() === 'owner' ? (
                  <div className="w-24 py-1 px-4 rounded-lg border border-[#BFA8D9] text-[#6A3B82] text-sm font-semibold flex items-center justify-center bg-white ml-2">
                    Owner
                  </div>
                ) : (
                  <>
                    <div className="relative w-28" id={`role-dropdown-${m.id}`}> 
                      <button
                        id={`role-dropdown-btn-${m.id}`}
                        type="button"
                        className={`w-full flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none border-[#BFA8D9] hover:border-[#6A3B82] focus:border-[#BFA8D9]`}
                        onClick={e => {
                          if (roleDropdownOpen === m.id) {
                            setRoleDropdownOpen(null);
                            window.removeEventListener('scroll', updateDropdownPosition, true);
                            if (membersScrollRef.current) {
                              membersScrollRef.current.removeEventListener('scroll', updateDropdownPosition, true);
                            }
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({
                              top: rect.bottom,
                              left: rect.left,
                              width: rect.width,
                            });
                            setRoleDropdownOpen(m.id);
                            setTimeout(() => {
                              window.addEventListener('scroll', updateDropdownPosition, true);
                              document.addEventListener('scroll', updateDropdownPosition, true);
                              if (membersScrollRef.current) {
                                membersScrollRef.current.addEventListener('scroll', updateDropdownPosition, true);
                              }
                            }, 0);
                          }
                        }}
                      >
                        <span className="text-gray-900">
                          {updatingRoleId === m.id ? (
                            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#6A3B82] rounded-full animate-spin align-middle"></span>
                          ) : (
                            m.role
                          )}
                        </span>
                        <ChevronDown className={`ml-2 transition-transform ${roleDropdownOpen === m.id ? 'rotate-180' : ''} text-gray-400`} size={18} />
                      </button>
                    </div>
                    <button
                      className="w-24 py-1 px-4 rounded-lg border border-red-200 text-red-500 text-sm font-medium transition-all duration-150 bg-white hover:border-red-400 hover:bg-red-50 focus:outline-none focus:border-red-400 focus:bg-red-50 ml-2"
                      aria-label="Remove member"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {roleDropdownOpen !== null && ReactDOM.createPortal(
        <div
          className="bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-[9999] animate-fade-in"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {['admin', 'member'].map(opt => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${membersArray.find(mem => mem.id === roleDropdownOpen)?.role?.toLowerCase() === opt ? 'font-semibold text-[#6A3B82]' : ''}`}
              onMouseDown={e => e.stopPropagation()}
              disabled={updatingRoleId === roleDropdownOpen}
              onClick={(e) => {
                e.stopPropagation();
                if (updatingRoleId === roleDropdownOpen) return;
                const memberId = roleDropdownOpen;
                const newRole = opt;
                const member = membersArray.find(mem => mem.id === memberId);
                const userId = member?.user?._id;
                if (member?.role?.toLowerCase() === newRole.toLowerCase()) {
                  setRoleDropdownOpen(null);
                  return;
                }
                setUpdatingRoleId(memberId);
                setLoadingMembers(true);
                setMembers(prev =>
                  prev.map(mem => mem.id === memberId ? { ...mem, role: newRole } : mem)
                );
                
                fetch(`/api/v1/workspaces/${workspaceId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    members: [
                      { user: userId, role: newRole }
                    ]
                  }),
                })
                  .then(res => {
                    if (!res.ok) {
                      res.text().then(text => {
                      });
                      throw new Error('Failed to update role');
                    }
                    return res.json();
                  })
                  .then((data) => {
                    let url = '';
                    if (entityType === 'workspace') {
                      url = `/api/v1/workspaces/${entityId}/members`;
                    } else if (entityType === 'board') {
                      url = `/api/v1/boards/${entityId}/members`;
                    }
                    fetch(url)
                      .then(res => res.json())
                      .then(data => {
                        const members = (data.data?.members || data.members || []).map(m => ({
                          ...m,
                          id: m.id || m._id,
                          name: m.user?.username || m.user?.email || "Unknown",
                          avatar: m.user?.avatar,
                          email: m.user?.email
                        }));
                        setMembers(members);
                      })
                      .finally(() => setLoadingMembers(false));
                    setSuccessMessage('Role updated successfully!');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  })
                  .catch((err) => {
                    setMembers(prev =>
                      prev.map(mem => mem.id === memberId ? { ...mem, role: member?.role } : mem)
                    );
                    setSuccessMessage('Failed to update role');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  })
                  .finally(() => {
                    setUpdatingRoleId(null);
                    setRoleDropdownOpen(null);
                    window.removeEventListener('scroll', updateDropdownPosition, true);
                    document.removeEventListener('scroll', updateDropdownPosition, true);
                    if (membersScrollRef.current) {
                      membersScrollRef.current.removeEventListener('scroll', updateDropdownPosition, true);
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
  );
};

export default MembersModal; 