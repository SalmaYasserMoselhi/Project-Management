import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import MemberSelectionPopup from "../Components/MemberSelectionPopup";

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

export default function CardAssignees({ cardId }) {
  const [assignees, setAssignees] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const boardId = useSelector((state) => state.cardDetails.boardId);

  // Fetch card members when component mounts or cardId changes
  useEffect(() => {
    if (cardId) {
      fetchCardMembers();
    }
  }, [cardId]);

  // Fetch card members
  const fetchCardMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`/api/v1/cards/${cardId}/members`);
      console.log("Card members data:", response.data.data.members);
      setAssignees(response.data.data.members);
    } catch (err) {
      console.error("Error fetching card members:", err);
      setError("Failed to load card members");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch board members
  const fetchBoardMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(
        `/api/v1/boards/${boardId}/members?limit=100`
      );
      console.log("Board members data:", response.data.data.members);
      setBoardMembers(response.data.data.members);
    } catch (err) {
      console.error("Error fetching board members:", err);
      setError("Failed to load board members");
    } finally {
      setIsLoading(false);
    }
  };

  // Add member to card
  const addMember = async (userId) => {
    try {
      setIsLoading(true);
      setError(null);
      await axios.post(`/api/v1/cards/${cardId}/members`, { userId });
      await fetchCardMembers();
    } catch (err) {
      console.error("Error adding member:", err);
      setError("Failed to add member");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove member from card
  const removeMember = async (userId) => {
    try {
      setIsLoading(true);
      setError(null);
      await axios.delete(`/api/v1/cards/${cardId}/members/${userId}`);
      await fetchCardMembers();
    } catch (err) {
      console.error("Error removing member:", err);
      setError("Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle changes from member selection popup
  const handleApplyChanges = async (finalMembers, pendingChanges) => {
    try {
      setIsLoading(true);
      setError(null);

      // Process all pending changes
      for (const userId of pendingChanges) {
        const isCurrentlyAssigned = assignees.some((assignee) => {
          if (assignee.user) {
            return assignee.user._id === userId || assignee.id === userId;
          } else {
            return assignee._id === userId || assignee.id === userId;
          }
        });

        if (isCurrentlyAssigned) {
          await removeMember(userId);
        } else {
          await addMember(userId);
        }
      }

      // Update assignees after changes are applied
      await fetchCardMembers();
    } catch (err) {
      console.error("Error applying changes:", err);
      setError("Failed to apply changes");
    } finally {
      setIsLoading(false);
    }
  };

  // Open the member selection popup
  const openMemberSelection = async () => {
    // Fetch board members first
    if (boardMembers.length === 0) {
      await fetchBoardMembers();
    }
    setIsPopupOpen(true);
  };

  return (
    <div className="flex flex-row items-center mt-4 w-full max-[320px]:flex-col max-[320px]:items-start relative">
      {/* عنوان */}
      <div className="w-30 text-gray-500 flex items-center">
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8"
          />
        </svg>
        Assignee
      </div>

      {/* الصور وزر الإضافة */}
      <div className="flex items-center gap-3 max-[320px]:ml-4 max-[320px]:mt-2 max-[320px]:w-full">
        {/* الصور المتداخلة */}
        <div className="flex -space-x-3">
          {isLoading && !assignees.length ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : assignees.length > 0 ? (
            assignees.map((assignee, index) => {
              // Make sure we're accessing the user data correctly
              const userData = assignee.user || assignee;
              return (
                <img
                  key={assignee.id || assignee._id || userData._id}
                  src={getUserAvatar(userData)}
                  alt={getUserDisplayName(userData)}
                  title={getUserDisplayName(userData)}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                />
              );
            })
          ) : (
            <div className="text-sm text-gray-400 ml-1">No assignees</div>
          )}
        </div>

        {/* زر الإضافة */}
        <button
          className="w-7 h-7 flex items-center justify-center rounded-full text-lg font-bold text-[#4D2D61] bg-[#DCCDE6] transition-all cursor-pointer hover:bg-[#c8b0d8]"
          onClick={openMemberSelection}
          disabled={isLoading}
        >
          <svg width="20" height="20" viewBox="0 0 22 22">
            <path fill="currentColor" d="M12 17h-2v-5H5v-2h5V5h2v5h5v2h-5Z" />
          </svg>
        </button>
      </div>

      {/* Member Selection Popup */}
      <MemberSelectionPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        allMembers={boardMembers}
        selectedMembers={assignees}
        title="Assign Members"
        onApplyChanges={handleApplyChanges}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
