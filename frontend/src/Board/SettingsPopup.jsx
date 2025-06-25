import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { ChevronDown, Shield, Check } from "lucide-react";

const SettingsPopup = ({ onClose, boardId }) => {
  const BASE_URL = "http://localhost:3000";

  const [settings, setSettings] = useState({
    canInviteMembers: false,
    canCreateList: false,
    cardEditing: "cardCreatorOnly",
    cardMoving: "cardCreatorOnly",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);

  const editDropdownRef = useRef(null);
  const moveDropdownRef = useRef(null);

  const permissionOptions = [
    { value: "cardCreatorOnly", label: "Card Creator Only" },
    { value: "admin", label: "Admin" },
    { value: "allMembers", label: "All members" },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      if (!boardId) {
        console.warn("[SettingsPopup] boardId is missing:", boardId);
        toast.error("Board ID is missing.");
        setIsFetching(false);
        return;
      }

      try {
        console.log("[SettingsPopup] Fetching settings for boardId:", boardId);
        const response = await axios.get(
          `${BASE_URL}/api/v1/boards/${boardId}`,
          {
            withCredentials: true,
          }
        );

        const boardSettings = response.data.data.board.settings?.general || {};
        console.log("[SettingsPopup] Fetched settings:", boardSettings);

        setSettings({
          canInviteMembers: boardSettings.memberInvitation === "enabled",
          canCreateList: boardSettings.memberListCreation === "enabled",
          cardEditing:
            boardSettings.cardEditing === "all_members"
              ? "allMembers"
              : boardSettings.cardEditing === "admins_only"
              ? "admin"
              : "cardCreatorOnly",
          cardMoving:
            boardSettings.cardMoving === "all_members"
              ? "allMembers"
              : boardSettings.cardMoving === "admins_only"
              ? "admin"
              : "cardCreatorOnly",
        });
      } catch (error) {
        console.error(
          "[SettingsPopup] Error fetching settings:",
          error.response?.data || error.message
        );
        toast.error(
          `Failed to load settings: ${error.response?.status || error.message}`
        );
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [boardId]);

  const handleSubmit = async () => {
    if (!boardId) {
      console.warn("[SettingsPopup] boardId is missing for submit:", boardId);
      toast.error("Board ID is missing.");
      return;
    }

    setIsLoading(true);

    const payload = {
      settings: {
        general: {
          memberInvitation: settings.canInviteMembers ? "enabled" : "disabled",
          cardEditing:
            settings.cardEditing === "allMembers"
              ? "all_members"
              : settings.cardEditing === "admin"
              ? "admins_only"
              : "card_creator_only",
          cardMoving:
            settings.cardMoving === "allMembers"
              ? "all_members"
              : settings.cardMoving === "admin"
              ? "admins_only"
              : "card_creator_only",
          memberListCreation: settings.canCreateList ? "enabled" : "disabled",
        },
      },
    };

    try {
      console.log(
        "[SettingsPopup] Submitting settings for boardId:",
        boardId,
        "Payload:",
        payload
      );
      const response = await axios.patch(
        `${BASE_URL}/api/v1/boards/user-boards/${boardId}`,
        payload,
        {
          withCredentials: true,
        }
      );
      console.log("[SettingsPopup] Update response:", response.data);

      toast.success("Settings updated successfully!");
      onClose();
    } catch (error) {
      console.error(
        "[SettingsPopup] Error updating settings:",
        error.response?.data || error.message
      );
      const validationError = error.response?.data?.error?.errors;
      if (validationError) {
        console.log("[SettingsPopup] Validation errors:", validationError);
        toast.error(
          `Validation failed: ${validationError.message || error.message}`
        );
      } else {
        toast.error(
          `Failed to update settings: ${
            error.response?.status || error.message
          }`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        editDropdownRef.current &&
        !editDropdownRef.current.contains(event.target)
      ) {
        setEditDropdownOpen(false);
      }
      if (
        moveDropdownRef.current &&
        !moveDropdownRef.current.contains(event.target)
      ) {
        setMoveDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openBorder = "border-[#6a3b82]";

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div
        className="absolute inset-0 bg-black/50 z-40"
        onClick={onClose}
      ></div>

      <div className="relative w-[550px] min-h-[350px] bg-white rounded-lg shadow-xl p-6 z-50 flex flex-col justify-between">
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-black text-xl font-semibold"
          onClick={onClose}
          disabled={isLoading}
        >
          ✕
        </button>

        <div>
          <h2 className="text-xl font-semibold mb-5">Settings</h2>

          <div className="border border-purple-200 rounded-lg shadow-sm bg-white">
            {isFetching ? (
              <div
                className="flex items-center justify-center p-6"
                style={{ minHeight: "200px" }}
              >
                <div className="animate-spin h-8 w-8 border-t-2 border-[#6a3b82] rounded-full"></div>
              </div>
            ) : (
              <div className="p-4 md:p-6">
                <h2 className="text-lg font-semibold text-[#6a3b82] flex items-center gap-2 mb-1">
                  <Shield size={20} />
                  Permissions
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Control who can perform actions in this board
                </p>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-md font-medium text-gray-700 min-w-[140px] mb-2">
                      Member can
                    </h3>
                    <div className="flex items-center gap-6 ml-2">
                      <div className="flex items-center gap-2 cursor-pointer">
                        <button
                          type="button"
                          className={`w-5 h-5 rounded-md border flex items-center justify-center z-10 pointer-events-auto transition-colors duration-150 ${
                            settings.canInviteMembers
                              ? "bg-[#4D2D61] border-[#4D2D61]"
                              : "border-gray-400 bg-white"
                          } ${
                            isLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          onClick={() =>
                            !isLoading &&
                            setSettings((prev) => ({
                              ...prev,
                              canInviteMembers: !prev.canInviteMembers,
                            }))
                          }
                          disabled={isLoading}
                          aria-label={
                            settings.canInviteMembers
                              ? "Disable member invitation"
                              : "Enable member invitation"
                          }
                        >
                          {settings.canInviteMembers ? (
                            <Check size={14} className="text-white" />
                          ) : null}
                        </button>
                        <span
                          className="text-sm text-gray-600"
                          onClick={() =>
                            !isLoading &&
                            setSettings((prev) => ({
                              ...prev,
                              canInviteMembers: !prev.canInviteMembers,
                            }))
                          }
                        >
                          Invite members
                        </span>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <button
                          type="button"
                          className={`w-5 h-5 rounded-md border flex items-center justify-center z-10 pointer-events-auto transition-colors duration-150 ${
                            settings.canCreateList
                              ? "bg-[#4D2D61] border-[#4D2D61]"
                              : "border-gray-400 bg-white"
                          } ${
                            isLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          onClick={() =>
                            !isLoading &&
                            setSettings((prev) => ({
                              ...prev,
                              canCreateList: !prev.canCreateList,
                            }))
                          }
                          disabled={isLoading}
                          aria-label={
                            settings.canCreateList
                              ? "Disable list creation"
                              : "Enable list creation"
                          }
                        >
                          {settings.canCreateList ? (
                            <Check size={14} className="text-white" />
                          ) : null}
                        </button>
                        <span
                          className="text-sm text-gray-600"
                          onClick={() =>
                            !isLoading &&
                            setSettings((prev) => ({
                              ...prev,
                              canCreateList: !prev.canCreateList,
                            }))
                          }
                        >
                          Create list
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-md font-medium text-gray-700 min-w-[140px] mb-2">
                      Who can
                    </h3>
                    <div className="flex items-center gap-4 mb-2 ml-2">
                      <div className="text-md font-medium text-gray-600 min-w-[140px]">
                        Card Editing
                      </div>
                      <div className="relative" ref={editDropdownRef}>
                        <button
                          type="button"
                          className={`flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none ${
                            editDropdownOpen
                              ? openBorder
                              : "border-[#BFA8D9] hover:border-[#6a3b82]"
                          } ${
                            !editDropdownOpen ? "focus:border-[#BFA8D9]" : ""
                          }`}
                          onClick={() => setEditDropdownOpen((v) => !v)}
                          disabled={isLoading}
                        >
                          <span className="text-gray-900">
                            {permissionOptions.find(
                              (opt) => opt.value === settings.cardEditing
                            )?.label || "Select"}
                          </span>
                          <ChevronDown
                            className={`ml-2 transition-transform ${
                              editDropdownOpen ? "rotate-180" : ""
                            } text-gray-400`}
                            size={18}
                          />
                        </button>
                        {editDropdownOpen && (
                          <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-20 animate-fade-in">
                            {permissionOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`w-full text-left px-4 py-2 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${
                                  settings.cardEditing === opt.value
                                    ? "bg-[#F3EFFF] font-semibold text-[#6a3b82]"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSettings((prev) => ({
                                    ...prev,
                                    cardEditing: opt.value,
                                  }));
                                  setEditDropdownOpen(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-2 ml-2">
                      <div className="text-md font-medium text-gray-600 min-w-[140px]">
                        Card Moving
                      </div>
                      <div className="relative" ref={moveDropdownRef}>
                        <button
                          type="button"
                          className={`flex items-center justify-between px-4 py-1 rounded-lg border transition-all duration-150 text-sm shadow-sm bg-white outline-none ${
                            moveDropdownOpen
                              ? openBorder
                              : "border-[#BFA8D9] hover:border-[#6a3b82]"
                          } ${
                            !moveDropdownOpen ? "focus:border-[#BFA8D9]" : ""
                          }`}
                          onClick={() => setMoveDropdownOpen((v) => !v)}
                          disabled={isLoading}
                        >
                          <span className="text-gray-900">
                            {permissionOptions.find(
                              (opt) => opt.value === settings.cardMoving
                            )?.label || "Select"}
                          </span>
                          <ChevronDown
                            className={`ml-2 transition-transform ${
                              moveDropdownOpen ? "rotate-180" : ""
                            } text-gray-400`}
                            size={18}
                          />
                        </button>
                        {moveDropdownOpen && (
                          <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-lg border border-[#E5D6F3] z-20 animate-fade-in">
                            {permissionOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`w-full text-left px-4 py-2 text-gray-900 hover:bg-[#F3EFFF] focus:bg-[#F3EFFF] transition-colors text-sm ${
                                  settings.cardMoving === opt.value
                                    ? "bg-[#F3EFFF] font-semibold text-[#6a3b82]"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSettings((prev) => ({
                                    ...prev,
                                    cardMoving: opt.value,
                                  }));
                                  setMoveDropdownOpen(false);
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
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            className={`bg-[#4D2D61] text-white px-5 py-2 rounded-lg hover:opacity-90 text-sm font-medium ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopup;
