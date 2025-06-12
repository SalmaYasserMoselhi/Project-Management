


import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const SettingsPopup = ({ onClose, boardId }) => {
  const BASE_URL = "http://localhost:3000";

  // Initialize all fields to false (unchecked)
  const [settings, setSettings] = useState({
    allowNotifications: false,
    memberPermissions: {
      inviteMembers: false,
      createList: false,
    },
    editCards: {
      cardCreator: false,
      admin: false,
      allMembers: false,
    },
    moveCards: {
      cardCreator: false,
      admin: false,
      allMembers: false,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  // Log boardId
  console.log("[SettingsPopup] boardId:", boardId);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!boardId) {
        console.warn("[SettingsPopup] boardId is missing.");
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/api/v1/boards/user-boards/${boardId}`, {
          withCredentials: true,
        });

        const boardSettings = response.data.data.board.settings || {};

        // Update settings with fetched data, falling back to false if undefined
        setSettings({
          allowNotifications: boardSettings.allowNotifications === "enabled" ? true : false,
          memberPermissions: {
            inviteMembers: boardSettings.inviteMembers === true ? true : false,
            createList: boardSettings.memberListCreation === "enabled" ? true : false,
          },
          editCards: {
            cardCreator: boardSettings.editPermissions?.cardCreator ?? false,
            admin: boardSettings.editPermissions?.admin ?? false,
            allMembers: boardSettings.editPermissions?.allMembers ?? false,
          },
          moveCards: {
            cardCreator: boardSettings.movePermissions?.cardCreator ?? false,
            admin: boardSettings.movePermissions?.admin ?? false,
            allMembers: boardSettings.movePermissions?.allMembers ?? false,
          },
        });
      } catch (error) {
        console.error("[SettingsPopup] Error fetching settings:", error.response?.data || error.message);
        toast.error("Failed to load settings. Using empty values.");
      }
    };

    fetchSettings();
  }, [boardId]);

  const handleCheckboxChange = (category, key) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key],
      },
    }));
  };

  const handleNotificationChange = () => {
    setSettings((prev) => ({
      ...prev,
      allowNotifications: !prev.allowNotifications,
    }));
  };

  const handleSubmit = async () => {
    if (!boardId) {
      toast.error("Board ID is missing.");
      return;
    }

    setIsLoading(true);

    const payload = {
      settings: {
        memberListCreation: settings.memberPermissions.createList ? "enabled" : "disabled",
        allowNotifications: settings.allowNotifications ? "enabled" : "disabled",
        editPermissions: {
          cardCreator: settings.editCards.cardCreator,
          admin: settings.editCards.admin,
          allMembers: settings.editCards.allMembers,
        },
        movePermissions: {
          cardCreator: settings.moveCards.cardCreator,
          admin: settings.moveCards.admin,
          allMembers: settings.moveCards.allMembers,
        },
      },
    };

    try {
      const response = await axios.patch(
        `${BASE_URL}/api/v1/boards/${boardId}`,
        payload,
        {
          withCredentials: true,
        }
      );

      toast.success("Settings updated successfully!");
      onClose();
    } catch (error) {
      console.error("[SettingsPopup] Error updating settings:", error.response?.data || error.message);
      toast.error("Failed to update settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-end items-center z-50">
      <div className="absolute inset-0 bg-black/50 z-40" onClick={onClose}></div>

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

          <div className="flex justify-between items-center mb-7">
            <span className="text-md font-medium">Allow notifications on this board</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.allowNotifications}
                onChange={handleNotificationChange}
                disabled={isLoading}
              />
              <div className="relative w-10 h-6 bg-gray-300 peer-checked:bg-[#4D2D61] rounded-full transition-all duration-200">
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-4"></div>
              </div>
            </label>
          </div>

          {/* Member Permissions */}
          <div className="mb-6">
            <p className="font-semibold text-sm mb-3">Members can</p>
            <div className="flex flex-row flex-wrap gap-7">
              {[
                { key: "inviteMembers", label: "Invite members" },
                { key: "createList", label: "Create list" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="accent-[#4D2D61] w-4 h-4"
                    checked={settings.memberPermissions[key]}
                    onChange={() => handleCheckboxChange("memberPermissions", key)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Edit Cards */}
          <div className="mb-6">
            <p className="font-semibold text-sm mb-3">Who can edit cards?</p>
            <div className="flex flex-row flex-wrap gap-7">
              {[
                { key: "cardCreator", label: "Card creator" },
                { key: "admin", label: "Admin" },
                { key: "allMembers", label: "All members" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-[#4D2D61] w-4 h-4"
                    checked={settings.editCards[key]}
                    onChange={() => handleCheckboxChange("editCards", key)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Move Cards */}
          <div>
            <p className="font-semibold text-sm mb-3">Who can move cards?</p>
            <div className="flex flex-row flex-wrap gap-7">
              {[
                { key: "cardCreator", label: "Card creator" },
                { key: "admin", label: "Admin" },
                { key: "allMembers", label: "All members" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-[#4D2D61] w-4 h-4"
                    checked={settings.moveCards[key]}
                    onChange={() => handleCheckboxChange("moveCards", key)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
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


