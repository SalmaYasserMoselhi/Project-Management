import React, { useEffect, useRef } from 'react';
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
}) => {
  const observerRef = useRef(null);

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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1E2E]/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative" onClick={e => e.stopPropagation()}>
        <div className="mb-2 text-gray-700 text-sm font-medium">People with access ({members.length})</div>
        <div
          ref={membersScrollRef}
          className="space-y-2 max-h-60 overflow-y-auto pr-1"
        >
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
              <span className="flex-1 text-gray-900 text-sm">{m.name}</span>
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
                  <span className="text-gray-900">{m.role}</span>
                  <ChevronDown className={`ml-2 transition-transform ${roleDropdownOpen === m.id ? 'rotate-180' : ''} text-gray-400`} size={18} />
                </button>
              </div>
              <button
                className="w-24 py-1 px-4 rounded-lg border border-red-200 text-red-500 text-sm font-medium transition-all duration-150 bg-white hover:border-red-400 hover:bg-red-50 focus:outline-none focus:border-red-400 focus:bg-red-50"
                aria-label="Remove member"
              >
                Remove
              </button>
            </div>
          ))}
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
          {['Owner', 'Admin', 'Member'].map(opt => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-4 py-1 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${members.find(mem => mem.id === roleDropdownOpen)?.role === opt ? 'font-semibold text-[#6A3B82]' : ''}`}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => {
                setMembers(prev =>
                  prev.map(mem => mem.id === roleDropdownOpen ? { ...mem, role: opt } : mem)
                );
                setRoleDropdownOpen(null);
                window.removeEventListener('scroll', updateDropdownPosition, true);
                document.removeEventListener('scroll', updateDropdownPosition, true);
                if (membersScrollRef.current) {
                  membersScrollRef.current.removeEventListener('scroll', updateDropdownPosition, true);
                }
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