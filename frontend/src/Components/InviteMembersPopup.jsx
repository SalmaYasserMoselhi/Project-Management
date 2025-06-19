"use client";

import { useRef, useState, useEffect } from "react";
import { usePopupAnimation } from "../utils/popup-animations";
import ReactDOM from "react-dom";
import { X, Mail } from "lucide-react";
import toast from "react-hot-toast";
import CustomDropdown from "./CustomDropdown";

const COLORS = {
  primary: "#4d2d61",
  secondary: "#7b4397",
  light: "#f3efff",
  white: "#fff",
  gray: "#f8f9fa",
  border: "#e2e8f0",
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

const BASE_URL = "http://localhost:3000";

const InviteMembersPopup = ({
  onClose,
  entityType = "workspace",
  entityId,
}) => {
  const modalRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState("");
  const [emails, setEmails] = useState([]);
  const [role, setRole] = useState(ROLES[0].value);
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [hoveredEmail, setHoveredEmail] = useState(null);

  usePopupAnimation();

  // Handle closing with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch workspace members on mount
  useEffect(() => {
    if (!entityId) return;
    const fetchMembers = async () => {
      try {
        const endpoint =
          entityType === "board"
            ? `${BASE_URL}/api/v1/boards/${entityId}/members`
            : `${BASE_URL}/api/v1/workspaces/${entityId}/members`;
        const res = await fetch(endpoint, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          setWorkspaceMembers(data.data.members || []);
        }
      } catch (err) {
        // ignore error
      }
    };
    fetchMembers();
  }, [entityId, entityType]);

  // Handle input change and suggestions
  useEffect(() => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    // اقتراحات فقط من أعضاء workspace الحقيقيين
    const lowerInput = input.toLowerCase();
    const memberSuggestions = workspaceMembers
      .filter(
        (m) =>
          m.user &&
          (m.user.email?.toLowerCase().includes(lowerInput) ||
            m.user.username?.toLowerCase().includes(lowerInput))
      )
      .map((m) => ({
        email: m.user.email.trim().toLowerCase(),
        name: m.user.username || m.user.email,
        avatar:
          m.user.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            m.user.username || m.user.email
          )}&background=4d2d61&color=fff`,
        role: m.role,
      }));
    setSuggestions(memberSuggestions);
  }, [input, workspaceMembers]);

  // Add email(s) on Enter, comma, or blur
  const handleInput = (e) => {
    if (e.key === "Enter" || e.key === "," || e.type === "blur") {
      const entered = input
        .split(/,|\s+/)
        .map((em) => em.trim())
        .filter((em) => em && !emails.includes(em));
      if (entered.length) {
        setEmails([...emails, ...entered]);
        setInput("");
        setSuggestions([]);
      }
    }
  };

  // Remove email
  const removeEmail = (em) => {
    setEmails(emails.filter((e) => e !== em));
  };

  // Select suggestion
  const selectSuggestion = (user) => {
    // Check if user is already a member (owner/admin/member)
    const member = workspaceMembers.find(
      (m) =>
        m.user &&
        m.user.email.trim().toLowerCase() === user.email.trim().toLowerCase()
    );
    if (member) {
      const entityName = entityType === "board" ? "board" : "workspace";
      toast.error(`This user is already a member of the ${entityName}.`);
      return;
    }
    if (!emails.includes(user.email)) {
      setEmails([...emails, user.email]);
    }
    setInput("");
    setSuggestions([]);
  };

  // Send invites
  const handleSendInvite = async () => {
    if (!entityId || emails.length === 0) return;
    setLoading(true);
    try {
      const endpoint =
        entityType === "board"
          ? `${BASE_URL}/api/v1/boards/${entityId}/invite`
          : `${BASE_URL}/api/v1/workspaces/${entityId}/invite`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invites: emails.map((email) => ({ email, role })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("Invitations sent successfully!");
        setEmails([]);
        setInput("");
        onClose();
      } else {
        throw new Error(data.message || "Failed to send invites");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send invites");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[200] invite-members-popup"
      style={{ background: "rgba(30, 22, 54, 0.25)" }}
    >
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[202]"
        style={{ minWidth: 370, maxWidth: 420 }}
      >
        <div
          ref={modalRef}
          className="shadow-lg"
          style={{
            background: COLORS.white,
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 4px 32px rgba(77,45,97,0.12)",
            minWidth: 350,
            maxWidth: 420,
            position: "relative",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              color: COLORS.primary,
              background: "none",
              border: 0,
              fontSize: 22,
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
          <h2
            style={{
              color: COLORS.primary,
              fontWeight: 700,
              fontSize: 22,
              marginBottom: 6,
            }}
          >
            Invite members
          </h2>
          <div style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 18 }}>
            Type or paste in emails below, separated by commas
          </div>

          {/* Email addresses input */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                fontWeight: 500,
                color: COLORS.primary,
                fontSize: 14,
                marginBottom: 4,
                display: "block",
              }}
            >
              Email addresses
            </label>
            <div
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                background: focused ? COLORS.gray : COLORS.white,
                padding: "7px 12px",
                display: "flex",
                flexWrap: "wrap",
                minHeight: 44,
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => setFocused(true)}
            >
              {emails.map((em) => (
                <span
                  key={em}
                  style={{
                    background: COLORS.light,
                    color: COLORS.primary,
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {em}
                  <button
                    onClick={() => removeEmail(em)}
                    style={{
                      marginLeft: 4,
                      color: COLORS.primary,
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                    }}
                    tabIndex={-1}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Search emails"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInput}
                onBlur={handleInput}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  flex: 1,
                  minWidth: 120,
                  fontSize: 15,
                  color: COLORS.primary,
                }}
              />
            </div>
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div
                style={{
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  marginTop: 2,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  zIndex: 10,
                  position: "relative",
                }}
              >
                {suggestions.map((user) => (
                  <div
                    key={user.email}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 12px",
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onMouseDown={() => selectSuggestion(user)}
                    onMouseEnter={(e) => {
                      setHoveredEmail(user.email);
                    }}
                    onMouseLeave={() => setHoveredEmail(null)}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      style={{ width: 28, height: 28, borderRadius: "50%" }}
                    />
                    <span style={{ fontWeight: 500, color: COLORS.primary }}>
                      {user.name}
                    </span>
                    {/* الرول يظهر بجانب كل suggestion */}
                    <span
                      style={{
                        marginLeft: "auto",
                        background: COLORS.light,
                        color: COLORS.primary,
                        borderRadius: 5,
                        fontSize: 12,
                        padding: "2px 8px",
                        textTransform: "uppercase",
                      }}
                    >
                      {user.role === "owner"
                        ? "OWNER"
                        : user.role === "admin"
                        ? "ADMIN"
                        : user.role === "member"
                        ? "MEMBER"
                        : "GUEST"}
                    </span>
                    {/* Tooltip بجانب العنصر */}
                    {hoveredEmail === user.email && (
                      <div
                        style={{
                          position: "absolute",
                          left: "100%",
                          top: "50%",
                          transform: "translateY(-50%)",
                          marginLeft: 12,
                          background: COLORS.primary,
                          color: COLORS.white,
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 14,
                          minWidth: 220,
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                          zIndex: 999,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{user.name}</span>
                        {" ("}
                        <span style={{ fontWeight: 400 }}>{user.email}</span>
                        {`)`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* If input is email and not found */}
            {input &&
              suggestions.length === 0 &&
              /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input) && (
                <div
                  style={{
                    background: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    marginTop: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 12px",
                    color: COLORS.primary,
                  }}
                >
                  <Mail size={18} style={{ color: COLORS.primary }} />
                  <span>{input}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: COLORS.primary,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Click to invite
                  </span>
                </div>
              )}
          </div>

          {/* Role selection */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontWeight: 500,
                color: COLORS.primary,
                fontSize: 14,
                marginBottom: 4,
                display: "block",
              }}
            >
              Role
            </label>
            <CustomDropdown
              options={ROLES}
              selected={role}
              onChange={setRole}
              className="w-full"
              buttonClassName="w-full"
              dropdownClassName="w-full"
            />
          </div>

          <button
            className="popup-btn-primary"
            style={{
              width: "100%",
              fontSize: 16,
              padding: "12px 0",
              background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
              border: 0,
              borderRadius: 8,
              color: COLORS.white,
              fontWeight: 600,
              marginTop: 8,
              boxShadow: "0 2px 8px rgba(77,45,97,0.08)",
            }}
            disabled={emails.length === 0 || loading}
            onClick={handleSendInvite}
          >
            {loading ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span
                  className="popup-spinner"
                  style={{
                    borderColor: COLORS.white,
                    borderTopColor: COLORS.primary,
                  }}
                ></span>
                Sending...
              </span>
            ) : (
              "Send invite"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InviteMembersPopup;
