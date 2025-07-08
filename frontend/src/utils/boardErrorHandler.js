/**
 * Board Error Handler Utility
 * Provides user-friendly error messages for board-related operations
 */

export const boardErrorMessages = {
  // Permission Errors
  403: {
    default: "You don't have permission to perform this action",
    settings_critical:
      "Only the board owner can modify member invitation and list creation settings",
    settings_general:
      "Only board owners and administrators can modify card permissions",
    role_change: "Only the board owner can change member roles",
    promote_admin: "Only the board owner can promote members to administrator",
    demote_admin: "Only the board owner can demote administrators",
    owner_role: "The board owner's role cannot be changed",
    remove_owner: "The board owner cannot be removed from the board",
    member_required: "You must be a board member to perform this action",
    admin_required: "Only administrators and owners can perform this action",
  },

  // Validation Errors
  400: {
    default: "The information provided is invalid",
    invalid_role: "Please select a valid role (Administrator or Member)",
    member_not_found: "The selected member was not found on this board",
    duplicate_member: "This member is already part of the board",
    invalid_settings: "Invalid settings configuration provided",
    missing_board_id: "Board identifier is missing",
    name_required: "Board name is required",
    name_too_long: "Board name cannot exceed 100 characters",
    description_too_long: "Board description cannot exceed 500 characters",
    invalid_member_setting: "Invalid member permission setting",
    invalid_card_setting: "Invalid card permission setting",
    board_archived: "This board has been archived and cannot be modified",
  },

  // Not Found Errors
  404: {
    default: "The requested resource was not found",
    board_not_found: "This board no longer exists or has been deleted",
    member_not_found: "The selected member was not found",
    list_not_found: "The selected list was not found",
    card_not_found: "The selected card was not found",
  },

  // Conflict Errors
  409: {
    default: "There was a conflict with the current state",
    board_already_archived: "This board is already archived",
    board_not_archived: "This board is not currently archived",
    member_already_exists: "This member is already part of the board",
  },

  // Server Errors
  500: {
    default: "An unexpected error occurred. Please try again later",
    database_error:
      "Database connection error. Please check your internet connection",
    permission_check_failed:
      "Unable to verify permissions. Please refresh the page",
    save_failed: "Failed to save changes. Please try again",
  },

  // Network Errors
  network: {
    default: "Network connection error. Please check your internet connection",
    timeout: "Request timed out. Please try again",
    offline: "You appear to be offline. Please check your internet connection",
    server_unreachable: "Unable to reach the server. Please try again later",
  },
};

/**
 * Get user-friendly error message based on error details
 * @param {Object} error - The error object from API response
 * @param {string} context - The context of the operation (e.g., 'settings', 'member_role', 'board_info')
 * @returns {string} User-friendly error message
 */
export const getBoardErrorMessage = (error, context = "default") => {
  // Handle network errors
  if (!navigator.onLine) {
    return boardErrorMessages.network.offline;
  }

  if (error.code === "NETWORK_ERROR" || error.message === "Network Error") {
    return boardErrorMessages.network.default;
  }

  if (error.code === "ECONNABORTED") {
    return boardErrorMessages.network.timeout;
  }

  if (error.code === "ERR_NETWORK") {
    return boardErrorMessages.network.server_unreachable;
  }

  // Handle API response errors
  const status = error.response?.status;
  const errorData = error.response?.data;
  const errorMessage = errorData?.message || error.message || "";

  // Handle specific error cases based on status and context
  switch (status) {
    case 403:
      if (
        errorMessage.includes("critical settings") ||
        context === "settings_critical"
      ) {
        return boardErrorMessages[403].settings_critical;
      }
      if (
        errorMessage.includes("general settings") ||
        errorMessage.includes("card permission") ||
        context === "settings_general"
      ) {
        return boardErrorMessages[403].settings_general;
      }
      if (
        errorMessage.includes("owner can promote") ||
        context === "promote_admin"
      ) {
        return boardErrorMessages[403].promote_admin;
      }
      if (
        errorMessage.includes("owner can demote") ||
        context === "demote_admin"
      ) {
        return boardErrorMessages[403].demote_admin;
      }
      if (errorMessage.includes("owner's role") || context === "owner_role") {
        return boardErrorMessages[403].owner_role;
      }
      if (
        errorMessage.includes("remove the board owner") ||
        context === "remove_owner"
      ) {
        return boardErrorMessages[403].remove_owner;
      }
      if (errorMessage.includes("board member") || context === "member_required") {
        return boardErrorMessages[403].member_required;
      }
      if (context === "role_change") {
        return boardErrorMessages[403].role_change;
      }
      return boardErrorMessages[403].default;

    case 400:
      if (errorMessage.includes("Invalid role") || context === "invalid_role") {
        return boardErrorMessages[400].invalid_role;
      }
      if (
        errorMessage.includes("Member not found") ||
        errorMessage.includes("not found on this board") ||
        context === "member_not_found"
      ) {
        return boardErrorMessages[400].member_not_found;
      }
      if (errorMessage.includes("Board ID") || errorMessage.includes("Board identifier") || context === "missing_board_id") {
        return boardErrorMessages[400].missing_board_id;
      }
      if (errorMessage.includes("name") && (errorMessage.includes("required") || errorMessage.includes("cannot be empty"))) {
        return boardErrorMessages[400].name_required;
      }
      if (errorMessage.includes("name") && errorMessage.includes("exceed")) {
        return boardErrorMessages[400].name_too_long;
      }
      if (
        errorMessage.includes("description") &&
        errorMessage.includes("exceed")
      ) {
        return boardErrorMessages[400].description_too_long;
      }
      if (errorMessage.includes("memberInvitation") || errorMessage.includes("memberListCreation")) {
        return boardErrorMessages[400].invalid_member_setting;
      }
      if (errorMessage.includes("cardEditing") || errorMessage.includes("cardMoving")) {
        return boardErrorMessages[400].invalid_card_setting;
      }
      if (errorMessage.includes("archived") || context === "archived") {
        return boardErrorMessages[400].board_archived;
      }
      if (context === "settings" || errorMessage.includes("settings")) {
        return boardErrorMessages[400].invalid_settings;
      }
      return boardErrorMessages[400].default;

    case 404:
      if (errorMessage.includes("Board not found") || context === "board") {
        return boardErrorMessages[404].board_not_found;
      }
      if (errorMessage.includes("Member not found") || context === "member") {
        return boardErrorMessages[404].member_not_found;
      }
      if (errorMessage.includes("List not found") || context === "list") {
        return boardErrorMessages[404].list_not_found;
      }
      if (errorMessage.includes("Card not found") || context === "card") {
        return boardErrorMessages[404].card_not_found;
      }
      return boardErrorMessages[404].default;

    case 409:
      if (errorMessage.includes("already archived") || context === "already_archived") {
        return boardErrorMessages[409].board_already_archived;
      }
      if (errorMessage.includes("not archived") || context === "not_archived") {
        return boardErrorMessages[409].board_not_archived;
      }
      if (errorMessage.includes("already exists") || errorMessage.includes("already part") || context === "duplicate_member") {
        return boardErrorMessages[409].member_already_exists;
      }
      return boardErrorMessages[409].default;

    case 500:
      if (
        errorMessage.includes("database") ||
        errorMessage.includes("Database")
      ) {
        return boardErrorMessages[500].database_error;
      }
      if (errorMessage.includes("permission") || context === "permissions") {
        return boardErrorMessages[500].permission_check_failed;
      }
      if (errorMessage.includes("save") || errorMessage.includes("update") || context === "save") {
        return boardErrorMessages[500].save_failed;
      }
      return boardErrorMessages[500].default;

    default:
      // Handle validation errors from MongoDB
      if (errorData?.errors) {
        const validationErrors = Object.values(errorData.errors);
        if (validationErrors.length > 0) {
          return `Please fix the following: ${validationErrors
            .map((err) => err.message)
            .join(", ")}`;
        }
      }

      // Return the original error message if it's user-friendly, otherwise use default
      if (
        errorMessage &&
        errorMessage.length < 100 &&
        !errorMessage.includes("Error:")
      ) {
        return errorMessage;
      }

      return boardErrorMessages[500].default;
  }
};

/**
 * Create a standardized error object for consistent handling
 * @param {Error} error - Original error
 * @param {string} context - Operation context
 * @returns {Object} Standardized error object
 */
export const createBoardError = (error, context = "default") => {
  return {
    message: getBoardErrorMessage(error, context),
    originalError: error,
    context,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Log board errors with context for debugging
 * @param {Error} error - Original error
 * @param {string} context - Operation context
 * @param {Object} additionalInfo - Additional debugging information
 */
export const logBoardError = (error, context, additionalInfo = {}) => {
  console.error(`[BoardError:${context}]`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    context,
    timestamp: new Date().toISOString(),
    ...additionalInfo,
  });
};

/**
 * Validate board settings before sending to server
 * @param {Object} settings - Settings object to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateBoardSettings = (settings) => {
  const errors = [];
  
  if (!settings.general) {
    errors.push("Settings must include general configuration");
    return { isValid: false, errors };
  }
  
  const validMemberSettings = ['enabled', 'disabled'];
  const validCardSettings = ['all_members', 'card_creator_only', 'admins_only'];
  
  if (settings.general.memberInvitation && !validMemberSettings.includes(settings.general.memberInvitation)) {
    errors.push("Member invitation setting must be 'enabled' or 'disabled'");
  }
  
  if (settings.general.memberListCreation && !validMemberSettings.includes(settings.general.memberListCreation)) {
    errors.push("Member list creation setting must be 'enabled' or 'disabled'");
  }
  
  if (settings.general.cardEditing && !validCardSettings.includes(settings.general.cardEditing)) {
    errors.push("Card editing setting must be 'all_members', 'card_creator_only', or 'admins_only'");
  }
  
  if (settings.general.cardMoving && !validCardSettings.includes(settings.general.cardMoving)) {
    errors.push("Card moving setting must be 'all_members', 'card_creator_only', or 'admins_only'");
  }
  
  return { isValid: errors.length === 0, errors };
};
