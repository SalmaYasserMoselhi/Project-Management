import { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, addHours } from "date-fns";
import TimePicker from "../Components/TimePicker";
import { useSelector, useDispatch } from "react-redux";
import { SketchPicker } from "react-color";
import {
  closeMeetingModal,
  updateMeetingName,
  updateMeetingDate,
  updateStartTime,
  updateEndTime,
  updateLink,
  updateInvitees,
  updateColor,
  resetMeetingData,
  saveMeetingData,
  updateMeetingData,
  deleteMeetingData,
} from "../features/Slice/MeetingSlice/meetingModalSlice";
import MemberSelectionPopup from "../Components/MemberSelectionPopup";
import axios from "axios";
import DeleteConfirmationDialog from "../Components/DeleteConfirmationDialog";

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

const getUserAvatar = (user) => {
  if (user.avatar && user.avatar !== "null" && user.avatar !== "undefined") {
    return user.avatar;
  }

  if (
    user.user &&
    user.user.avatar &&
    user.user.avatar !== "null" &&
    user.user.avatar !== "undefined"
  ) {
    return user.user.avatar;
  }

  return `https://ui-avatars.com/api/?name=${getUserDisplayName(
    user
  )}&background=random&color=fff`;
};

const AddMeetingModal = ({ boardId }) => {
  // Use Redux state instead of props
  const { isOpen, isEditing, editingMeetingId, meetingData, status, error } =
    useSelector((state) => state.meetingModal);
  const dispatch = useDispatch();

  // Local states for UI interaction
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [boardMembers, setBoardMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState(null);

  const datePickerRef = useRef(null);
  const startTimePickerRef = useRef(null);
  const endTimePickerRef = useRef(null);
  const colorPickerRef = useRef(null);
  const colorButtonRef = useRef(null);
  const linkInputRef = useRef(null);
  const modalContentRef = useRef(null);
  const deleteDialogRef = useRef(null);

  // Close modal function now dispatches Redux action
  const handleClose = () => {
    dispatch(closeMeetingModal());
  };

  // Handle meeting name change
  const handleMeetingNameChange = (e) => {
    dispatch(updateMeetingName(e.target.value));
  };

  // Handle date change
  const handleDateChange = (date) => {
    dispatch(updateMeetingDate(date));
    setIsDatePickerOpen(false);
  };

  // Handle link change
  const handleLinkChange = (e) => {
    dispatch(updateLink(e.target.value));
  };

  // Handle save button click
  const handleSave = () => {
    if (isEditing && editingMeetingId) {
      // Update existing meeting
      dispatch(updateMeetingData(editingMeetingId))
        .unwrap()
        .then(() => {
          // Close modal on success
          handleClose();
        })
        .catch((err) => {
          console.error("Failed to update meeting:", err);
        });
    } else {
      // Create new meeting
      dispatch(saveMeetingData(boardId))
        .unwrap()
        .then(() => {
          // Close modal on success
          handleClose();
        })
        .catch((err) => {
          console.error("Failed to save meeting:", err);
        });
    }
  };

  // Handle delete button click
  const handleDelete = () => {
    if (isEditing && editingMeetingId) {
      setShowDeleteConfirm(true);
    }
  };

  // Handle confirmed delete
  const handleConfirmDelete = () => {
    dispatch(deleteMeetingData(editingMeetingId))
      .unwrap()
      .then(() => {
        // Close modal on success
        handleClose();
      })
      .catch((err) => {
        console.error("Failed to delete meeting:", err);
      });
    setShowDeleteConfirm(false);
  };

  // Fetch board members when needed
  const fetchBoardMembers = async () => {
    try {
      setIsLoadingMembers(true);
      setMemberError(null);
      const response = await axios.get(
        `/api/v1/boards/${boardId}/members?limit=100`
      );
      setBoardMembers(response.data.data.members);
    } catch (err) {
      console.error("Error fetching board members:", err);
      setMemberError("Failed to load board members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Open member selection popup
  const openMemberSelection = async () => {
    if (boardMembers.length === 0) {
      await fetchBoardMembers();
    }
    setIsMemberSelectionOpen(true);
  };

  // Handle member selection changes
  const handleMemberSelectionChanges = (finalMembers, pendingChanges) => {
    console.log("Final members after selection:", finalMembers);
    dispatch(updateInvitees(finalMembers));
  };

  // Remove a specific invitee
  const removeInvitee = (id) => {
    console.log("Removing invitee with ID:", id);
    console.log("Current invitees:", meetingData.invitees);

    const updatedInvitees = meetingData.invitees.filter((invitee) => {
      const inviteeId =
        (invitee.user && invitee.user._id) || invitee._id || invitee.id;
      console.log("Comparing", inviteeId, "with", id);
      return inviteeId !== id;
    });

    console.log("Updated invitees:", updatedInvitees);
    dispatch(updateInvitees(updatedInvitees));
  };

  // Reset meeting data when modal is closed
  useEffect(() => {
    if (!isOpen) {
      dispatch(resetMeetingData());
      setShowDeleteConfirm(false); // Reset delete dialog state
    }
  }, [isOpen, dispatch]);

  // Effect to handle clicks outside the modal
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Only run this effect if the modal is open
      if (!isOpen) return;

      // If delete dialog is open, handle its outside clicks separately
      if (showDeleteConfirm) {
        if (
          deleteDialogRef.current &&
          !deleteDialogRef.current.contains(event.target)
        ) {
          // Click outside delete dialog - close only the delete dialog
          setShowDeleteConfirm(false);
        }
        return; // Don't close the main modal when delete dialog is open
      }

      // Check if click is outside the modal content (only when delete dialog is not open)
      if (
        modalContentRef.current &&
        !modalContentRef.current.contains(event.target)
      ) {
        handleClose();
      }
    };

    // Add event listener when the modal is open
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    // Clean up the event listener
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, showDeleteConfirm]);

  // Close Pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target) &&
        isDatePickerOpen
      ) {
        setIsDatePickerOpen(false);
      }

      // Close start time picker when clicking outside
      if (
        startTimePickerRef.current &&
        !startTimePickerRef.current.contains(event.target) &&
        isStartTimePickerOpen
      ) {
        setIsStartTimePickerOpen(false);
      }

      // Close end time picker when clicking outside
      if (
        endTimePickerRef.current &&
        !endTimePickerRef.current.contains(event.target) &&
        isEndTimePickerOpen
      ) {
        setIsEndTimePickerOpen(false);
      }

      // Close color picker when clicking outside
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(event.target) &&
        showColorPicker
      ) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    isDatePickerOpen,
    isStartTimePickerOpen,
    isEndTimePickerOpen,
    showColorPicker,
  ]);

  if (!isOpen) return null;

  const formattedDate = format(meetingData.startDate, "EEE, MMM d");
  const formattedStartTime = format(meetingData.startTime, "h:mm a");
  const formattedEndTime = format(meetingData.endTime, "h:mm a");

  const toggleDatePicker = () => {
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  const toggleStartTimePicker = (e) => {
    setIsStartTimePickerOpen(!isStartTimePickerOpen);
  };

  const toggleEndTimePicker = (e) => {
    setIsEndTimePickerOpen(!isEndTimePickerOpen);
  };

  const copyLinkToClipboard = () => {
    if (meetingData.link) {
      navigator.clipboard.writeText(meetingData.link);
      setIsCopied(true);

      // Reset after 1 second
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    }
  };

  return (
    // The modal backdrop - no ref here so clicks on it will close the modal
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* The modal content - add ref here to prevent closing when clicking inside */}
      <div
        ref={modalContentRef}
        className="w-full max-w-md max-h-[90vh] bg-white rounded-lg shadow-lg flex flex-col"
      >
        {/* Header - Fixed at top */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-medium text-gray-800">
            {isEditing ? "Edit Meeting" : "Add Meeting"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div
          className={`flex-grow p-4 ${
            showColorPicker ? "overflow-visible" : "overflow-y-auto"
          }`}
        >
          {/* Meeting Name */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Meeting Name
            </label>
            <input
              type="text"
              placeholder="Meeting Name"
              value={meetingData.meetingName}
              onChange={handleMeetingNameChange}
              className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57356A]"
            />
          </div>

          {/* Date Field */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Date
            </label>
            <div className="relative w-full" ref={datePickerRef}>
              <input
                type="text"
                value={formattedDate}
                readOnly
                className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57356A]"
              />
              <div
                className="absolute right-2 top-2 text-gray-500 cursor-pointer"
                onClick={toggleDatePicker}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              {isDatePickerOpen && (
                <div className="absolute z-10 mt-1 right-0">
                  <DatePicker
                    selected={meetingData.startDate}
                    onChange={handleDateChange}
                    inline
                  />
                </div>
              )}
            </div>
          </div>

          {/* Time Fields */}
          <div className="mb-4 flex gap-4">
            {/* Start Time */}
            <div className="w-1/2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Start Time
              </label>
              <div className="relative" ref={startTimePickerRef}>
                <input
                  type="text"
                  value={formattedStartTime}
                  readOnly
                  className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57356A]"
                />
                <div
                  className="absolute right-2 top-2 text-gray-500 cursor-pointer"
                  onClick={toggleStartTimePicker}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                {isStartTimePickerOpen && (
                  <TimePicker
                    initialTime={meetingData.startTime}
                    onTimeChange={(time) => {
                      dispatch(updateStartTime(time));
                    }}
                    isOpen={isStartTimePickerOpen}
                    onClose={() => setIsStartTimePickerOpen(false)}
                    className="left-0"
                  />
                )}
              </div>
            </div>

            {/* End Time */}
            <div className="w-1/2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                End Time
              </label>
              <div className="relative" ref={endTimePickerRef}>
                <input
                  type="text"
                  value={formattedEndTime}
                  readOnly
                  className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57356A]"
                />
                <div
                  className="absolute right-2 top-2 text-gray-500 cursor-pointer"
                  onClick={toggleEndTimePicker}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                {isEndTimePickerOpen && (
                  <TimePicker
                    initialTime={meetingData.endTime}
                    onTimeChange={(time) => dispatch(updateEndTime(time))}
                    isOpen={isEndTimePickerOpen}
                    onClose={() => setIsEndTimePickerOpen(false)}
                    className="right-0"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-4">
            {/* <label className="block text-gray-700 text-sm font-bold mb-2">
              Event Color
            </label> */}
            <div className="flex items-center gap-3">
              <span className="text-gray-700 text-sm font-bold">Color</span>
              <div className="relative">
                <div
                  ref={colorButtonRef}
                  className="w-10 h-5 rounded-md cursor-pointer border border-gray-300"
                  style={{ backgroundColor: meetingData.color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div
                    ref={colorPickerRef}
                    className="absolute left-full top-0 ml-2 z-50"
                  >
                    <SketchPicker
                      color={meetingData.color}
                      onChange={(color) => dispatch(updateColor(color.hex))}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Meeting Link */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Online Link
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Link.com"
                value={meetingData.link}
                onChange={handleLinkChange}
                ref={linkInputRef}
                className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57356A] pr-10"
              />
              <div
                className="absolute right-2 top-2 text-gray-500 cursor-pointer"
                onClick={copyLinkToClipboard}
              >
                {isCopied ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Invitees */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Invitees
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {meetingData.invitees.length > 0 ? (
                meetingData.invitees.map((invitee) => {
                  const userData = invitee.user || invitee;
                  const inviteeId =
                    (invitee.user && invitee.user._id) ||
                    invitee._id ||
                    invitee.id;
                  const displayName = getUserDisplayName(userData);

                  return (
                    <div
                      key={inviteeId}
                      className="flex items-center bg-gray-100 rounded-full px-2 py-1"
                    >
                      <img
                        src={getUserAvatar(userData)}
                        alt={displayName}
                        className="w-6 h-6 rounded-full mr-1"
                      />
                      <span className="text-sm mr-1">{displayName}</span>
                      <button
                        className="text-gray-500 hover:text-gray-700 rounded-full h-5 w-5 flex items-center justify-center bg-gray-200"
                        onClick={() => removeInvitee(inviteeId)}
                        aria-label="Remove invitee"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-400">No invitees added</div>
              )}
              <button
                onClick={openMemberSelection}
                className="flex items-center text-[#4D2D61] gap-1 px-2 py-1 hover:bg-purple-50 rounded-md"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Member Selection Popup */}
          <MemberSelectionPopup
            isOpen={isMemberSelectionOpen}
            onClose={() => setIsMemberSelectionOpen(false)}
            allMembers={boardMembers}
            selectedMembers={meetingData.invitees}
            title="Select Invitees"
            onApplyChanges={handleMemberSelectionChanges}
            isLoading={isLoadingMembers}
            error={memberError}
          />
        </div>

        {/* Fixed Footer with Buttons */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-evenly gap-2">
            {isEditing && (
              <button
                className="w-full bg-gray-300 text-red-600 rounded-md cursor-pointe py-2 px-6 font-medium transition-colors"
                onClick={handleDelete}
                disabled={status === "loading"}
              >
                Delete
              </button>
            )}
            <button
              className={`w-full bg-gradient-to-r from-[#4d2d61] to-[#7b4397] hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] text-white font-medium py-2 px-6 rounded-md transition-colors ${
                status === "loading" ? "opacity-70 cursor-not-allowed" : ""
              } ${!isEditing ? "ml-auto" : ""}`}
              onClick={handleSave}
              disabled={status === "loading"}
            >
              {status === "loading"
                ? isEditing
                  ? "Updating..."
                  : "Saving..."
                : isEditing
                ? "Update"
                : "Save"}
            </button>
          </div>

          {/* Error message in footer */}
          {status === "failed" && (
            <div className="mt-3 text-red-500 text-sm">
              {error || "Failed to save meeting. Please try again."}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Meeting"
          itemName={meetingData.meetingName || "Meeting"}
          itemType="meeting"
          confirmText="Delete Meeting"
          cancelText="Cancel"
          loading={status === "loading"}
        />
      )}
    </div>
  );
};

export default AddMeetingModal;
