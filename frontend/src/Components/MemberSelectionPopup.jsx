import { useState, useEffect, useRef } from "react";
import UserAvatar from "./UserAvatar";

// Helper function to get user display name
const getUserDisplayName = (user) => {
  const firstName = user.firstName || (user.user && user.user.firstName);
  const lastName = user.lastName || (user.user && user.user.lastName);
  const username = user.username || (user.user && user.user.username);
  const email = user.email || (user.user && user.user.email);

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (username) {
    return username;
  } else if (email) {
    return email.split("@")[0];
  } else {
    return "Unknown User";
  }
};

// Helper function to get avatar URL or generate one
const getUserAvatar = (user) => {
  // Check for actual avatar URL with multiple possible property names
  if (user.avatar && user.avatar !== "null" && user.avatar !== "undefined") {
    return user.avatar;
  }

  // For board members, the avatar might be nested in a different way
  if (
    user.user &&
    user.user.avatar &&
    user.user.avatar !== "null" &&
    user.user.avatar !== "undefined"
  ) {
    return user.user.avatar;
  }

  // Generate initials for the avatar
  let initials;
  let firstName = user.firstName || (user.user && user.user.firstName);
  let lastName = user.lastName || (user.user && user.user.lastName);
  let username = user.username || (user.user && user.user.username);
  let email = user.email || (user.user && user.user.email);

  if (firstName && lastName) {
    initials = `${firstName[0]}${lastName[0]}`;
  } else if (username) {
    initials = username.substring(0, 2).toUpperCase();
  } else if (email) {
    initials = email.substring(0, 2).toUpperCase();
  } else {
    initials = "UN";
  }

  // Generate a consistent color based on the user ID or name
  const userId = user._id || (user.user && user.user._id) || "";
  const userEmail = email || "";
  const colorIndex =
    (userId.toString().charCodeAt(0) || userEmail.charCodeAt(0) || 0) %
    avatarColors.length;
  const bgColor = avatarColors[colorIndex];

  return `https://ui-avatars.com/api/?name=${initials}&background=${bgColor.replace(
    "#",
    ""
  )}&color=fff&bold=true&size=128`;
};

// Array of background colors for avatars
const avatarColors = [
  "#4D2D61", // Primary brand color
  "#7b4397", // Secondary brand color
  "#3498db", // Blue
  "#2ecc71", // Green
  "#e74c3c", // Red
  "#f39c12", // Orange
  "#9b59b6", // Purple
  "#1abc9c", // Teal
  "#34495e", // Dark blue
];

export default function MemberSelectionPopup({
  isOpen,
  onClose,
  allMembers,
  selectedMembers,
  title = "Select Members",
  onApplyChanges,
  isLoading,
  error,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(new Set());

  const popupRef = useRef(null);

  // Initialize filtered members
  useEffect(() => {
    if (allMembers) {
      setFilteredMembers(allMembers);
    }
  }, [allMembers]);

  // Filter members based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMembers(allMembers);
    } else {
      const filtered = allMembers.filter((member) => {
        const userData = member.user || member;
        return (
          userData.firstName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          userData.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          userData.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          userData.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredMembers(filtered);
    }
  }, [searchTerm, allMembers]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Check if a user is selected (including pending changes)
  const isUserSelected = (userId) => {
    const isCurrentlySelected = selectedMembers.some((member) => {
      const memberUserId =
        (member.user && member.user._id) || member._id || member.id;
      return memberUserId === userId;
    });

    // Check pending changes
    if (pendingChanges.has(userId)) {
      return !isCurrentlySelected; // If in pending changes, it means we're toggling the state
    }

    return isCurrentlySelected;
  };

  // Toggle member selection (updates pending changes)
  const toggleMember = (userId) => {
    setPendingChanges((prev) => {
      const newChanges = new Set(prev);
      if (newChanges.has(userId)) {
        newChanges.delete(userId);
        console.log(`Removed ${userId} from pending changes`);
      } else {
        newChanges.add(userId);
        console.log(`Added ${userId} to pending changes`);
      }
      return newChanges;
    });
  };

  // Apply pending changes and close popup
  const handleApply = () => {
    // Calculate final selected members
    const finalMembers = [...selectedMembers];

    // Process pending changes
    pendingChanges.forEach((userId) => {
      const isCurrentlySelected = selectedMembers.some(
        (member) =>
          (member.user ? member.user._id : member._id) === userId ||
          member.id === userId
      );

      if (isCurrentlySelected) {
        // Remove member
        const index = finalMembers.findIndex(
          (member) =>
            (member.user && member.user._id) === userId ||
            member._id === userId ||
            member.id === userId
        );
        if (index !== -1) finalMembers.splice(index, 1);
      } else {
        // Add member
        const memberToAdd = allMembers.find(
          (member) => (member.user && member.user._id) === userId
        );
        if (memberToAdd) finalMembers.push(memberToAdd);
      }
    });

    console.log("MemberSelectionPopup - finalMembers:", finalMembers);
    console.log(
      "MemberSelectionPopup - pendingChanges:",
      Array.from(pendingChanges)
    );

    onApplyChanges(finalMembers, pendingChanges);
    setPendingChanges(new Set());
    setSearchTerm("");
    onClose();
  };

  // Close popup and discard changes
  const handleCancel = () => {
    setPendingChanges(new Set());
    setSearchTerm("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div
        ref={popupRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="mt-2 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4D2D61]"
            />
            {searchTerm && (
              <button
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchTerm("")}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4D2D61]"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">{error}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-gray-500 text-center p-4">
              No members found
            </div>
          ) : (
            <>
              {/* Selected Members Section */}
              <div className="mb-2">
                <div className="px-2 py-1 text-sm font-medium text-gray-500 border-b border-gray-200">
                  Selected Members
                </div>
                {filteredMembers.filter((member) => {
                  const userData = member.user || member;
                  const userId = userData._id;
                  return isUserSelected(userId);
                }).length === 0 ? (
                  <div className="text-sm text-gray-400 p-2">
                    No members selected
                  </div>
                ) : (
                  filteredMembers
                    .filter((member) => {
                      const userData = member.user || member;
                      const userId = userData._id;
                      return isUserSelected(userId);
                    })
                    .map((member) => {
                      const userData = member.user || member;
                      const userId = userData._id;
                      const displayName = getUserDisplayName(userData);

                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar user={member} className="h-8 w-8" />
                            <div>
                              <p className="font-medium text-sm">
                                {displayName}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {userData.email ||
                                  (userData.user && userData.user.email)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleMember(userId)}
                            className="w-6 h-6 rounded-full flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200"
                            title="Remove member"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 12H4"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Other Members Section */}
              <div>
                <div className="px-2 py-1 text-sm font-medium text-gray-500 border-b border-gray-200">
                  Other Members
                </div>
                {filteredMembers.filter((member) => {
                  const userData = member.user || member;
                  const userId = userData._id;
                  return !isUserSelected(userId);
                }).length === 0 ? (
                  <div className="text-sm text-gray-400 p-2">
                    No other members available
                  </div>
                ) : (
                  filteredMembers
                    .filter((member) => {
                      const userData = member.user || member;
                      const userId = userData._id;
                      return !isUserSelected(userId);
                    })
                    .map((member) => {
                      const userData = member.user || member;
                      const userId = userData._id;
                      const displayName = getUserDisplayName(userData);

                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar user={member} className="h-8 w-8" />
                            <div>
                              <p className="font-medium text-sm">
                                {displayName}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {userData.email ||
                                  (userData.user && userData.user.email)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleMember(userId)}
                            className="w-6 h-6 rounded-full flex items-center justify-center bg-[#DCCDE6] text-[#4d2d61] hover:bg-[#c8b0d8]"
                            title="Add member"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleCancel}
            className="mr-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white rounded-md hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px]"
            disabled={isLoading}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
