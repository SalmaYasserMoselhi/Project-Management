import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import MemberSelectionPopup from "../Components/MemberSelectionPopup";
import UserAvatar from "../Components/UserAvatar";
import {
  fetchCardAssignees,
  addPendingAssignee,
  removePendingAssignee,
  fetchBoardMembers,
  updateCardAssignees,
} from "../features/Slice/cardSlice/cardDetailsSlice";

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
  const dispatch = useDispatch();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Get state from Redux
  const {
    assignees,
    pendingAssignees,
    boardMembers,
    boardId,
    assigneesLoading,
    boardMembersLoading,
    assigneesError,
    boardMembersError,
  } = useSelector((state) => state.cardDetails);

  // Combine current assignees with pending assignees for display
  const allAssignees = [...assignees, ...pendingAssignees];

  // Fetch card assignees when component mounts or cardId changes
  useEffect(() => {
    if (cardId) {
      dispatch(fetchCardAssignees(cardId));
    }
  }, [cardId, dispatch]);

  // Add member to card (pending)
  const addMember = async (userId) => {
    try {
      await dispatch(addPendingAssignee({ userId })).unwrap();
    } catch (err) {
      console.error("Error adding member:", err);
    }
  };

  // Remove member from card (pending)
  const removeMember = async (userId) => {
    try {
      await dispatch(removePendingAssignee({ userId })).unwrap();
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  // Handle changes from member selection popup
  const handleApplyChanges = async (finalMembers, pendingChanges) => {
    try {
      // Prepare bulk changes
      const assigneeChanges = [];

      for (const userId of pendingChanges) {
        const isCurrentlyAssigned = allAssignees.some((assignee) => {
          const assigneeId = assignee.user?._id || assignee._id || assignee.id;
          return assigneeId === userId;
        });

        if (isCurrentlyAssigned) {
          assigneeChanges.push({ userId, action: "remove" });
        } else {
          assigneeChanges.push({ userId, action: "add" });
        }
      }

      // Apply all changes at once using pending system
      for (const change of assigneeChanges) {
        if (change.action === "add") {
          await addMember(change.userId);
        } else {
          await removeMember(change.userId);
        }
      }
    } catch (err) {
      console.error("Error applying changes:", err);
    }
  };

  // Open the member selection popup
  const openMemberSelection = async () => {
    // Fetch board members first if not already loaded
    if (boardMembers.length === 0 && boardId) {
      await dispatch(fetchBoardMembers(boardId));
    }
    setIsPopupOpen(true);
  };

  // Determine loading state
  const isLoading = assigneesLoading || boardMembersLoading;
  const error = assigneesError || boardMembersError;

  return (
    <div className="flex flex-row items-center mt-4 w-full ">
      <div className="w-30 text-gray-500 flex items-center">
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8"
          />
        </svg>
        Assignee
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-3">
          {isLoading && !allAssignees.length ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : allAssignees.length > 0 ? (
            allAssignees.map((assignee, index) => {
              // Make sure we're accessing the user data correctly
              const userData = assignee.user || assignee;
              const isPending = assignee.isPending;
              return (
                <div
                  key={assignee.id || assignee._id || userData._id}
                  className="relative"
                >
                  <UserAvatar
                    user={userData}
                    className={`w-8 h-8 rounded-full border-2 border-white shadow-md ${
                      isPending ? "opacity-60" : ""
                    }`}
                  />
                  {isPending && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
                  )}
                </div>
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
        selectedMembers={allAssignees}
        title="Assign Members"
        onApplyChanges={handleApplyChanges}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
