const AppError = require('./appError');

/**
 * Centralized permission service for the application
 * Handles permission verification across boards, lists, and cards
 */
const permissionService = {
  /**
   * Helper function to find a member in a members array by userId
   * @param {Array} members - Array of member objects
   * @param {String} userId - User ID to find
   * @returns {Object|null} - The member object or null if not found
   */
  findMember(members, userId) {
    if (!members || !Array.isArray(members) || !userId) {
      return null;
    }

    try {
      const userIdString = userId.toString();

      for (const member of members) {
        if (!member || !member.user) continue;

        let memberId;

        if (typeof member.user === 'object' && member.user !== null) {
          if (!member.user._id) continue;
          memberId = member.user._id.toString();
        } else {
          memberId = member.user.toString();
        }

        if (memberId === userIdString) {
          return member;
        }
      }
    } catch (error) {
      console.error('Error in findMember:', error);
    }

    return null;
  },

  /**
   * Check if a user has a specific permission on a board
   * @param {Object} board - The board object
   * @param {String} userId - The user ID
   * @param {String} permission - The permission to check
   * @returns {Boolean} - True if the user has the permission
   */
  hasPermission(board, userId, permission) {
    if (!board || !userId || !permission) {
      return false;
    }

    // Find the member in the board
    let member = this.findMember(board.members, userId);
    if (!member) return false;

    // Board owner has all permissions
    if (member.role === 'owner') return true;

    // Check if the member has the specific permission
    if (
      member.permissions &&
      Array.isArray(member.permissions) &&
      member.permissions.includes(permission)
    ) {
      return true;
    }

    // Check member permissions settings based on role and board settings
    if (member.role === 'admin') {
      // Admins have most permissions by default
      const adminRestrictions = ['delete_board'];
      if (adminRestrictions.includes(permission)) {
        return false;
      }
      return true;
    }

    // For regular members, check the board settings
    if (member.role === 'member') {
      // Make sure board settings exists and has general property
      const settings = board.settings || {};
      const generalSettings = settings.general || {};

      switch (permission) {
        case 'create_lists':
          return generalSettings.memberListCreation === 'enabled';
        case 'invite_members':
          return generalSettings.memberInvitation === 'enabled';
        case 'edit_other_cards':
          return generalSettings.cardEditing === 'all_members';
        case 'move_other_cards':
          return generalSettings.cardMoving === 'all_members';
        case 'comment':
          return generalSettings.commenting !== 'disabled'; // Default to true if not specified
        case 'export_board':
          return generalSettings.exportPermission === 'all_members';
        case 'create_cards':
        case 'view_board':
          return true; // Members can always create cards and view the board
        default:
          return false;
      }
    }

    return false;
  },

  /**
   * Check if a user has a specific permission on a workspace
   * @param {Object} workspace - The workspace object
   * @param {String} userId - The user ID
   * @param {String} permission - The permission to check
   * @returns {Boolean} - True if the user has the permission
   */
  hasWorkspacePermission(workspace, userId, permission) {
    if (!workspace || !userId || !permission) {
      return false;
    }

    // Find the member
    let member = this.findMember(workspace.members, userId);
    if (!member) {
      return false;
    }

    // Owner has all permissions
    if (member.role === 'owner') {
      return true;
    }

    // Special case for 'create_boards' permission based on workspace settings
    if (permission === 'create_boards') {
      // Get the boardCreation setting with a default
      const settings = workspace.settings || {};
      const boardCreation = settings.boardCreation || 'admin'; // Default to admin if not set

      // Enforce the permission hierarchy based on settings
      switch (boardCreation) {
        case 'owner':
          // Only owners can create boards (handled above)
          return false;
        case 'admin':
          // Only admins and owners can create boards
          return member.role === 'admin';
        case 'member':
          // Any member can create boards
          return true;
        default:
          // Default to restrictive policy
          return member.role === 'admin';
      }
    }

    // Special case for 'invite_members' permission
    if (permission === 'invite_members') {
      const settings = workspace.settings || {};
      const inviteRestriction = settings.inviteRestriction || 'admin'; // Default to admin if not set

      switch (inviteRestriction) {
        case 'owner':
          // Only owners can invite (handled above)
          return false;
        case 'admin':
          // Only admins and owners can invite
          return member.role === 'admin';
        case 'member':
          // Any member can invite
          return true;
        default:
          return member.role === 'admin';
      }
    }

    // For admins, allow most permissions by default
    if (member.role === 'admin') {
      // Restricted permissions for admins
      const adminRestrictions = ['delete_workspace', 'manage_roles'];
      return !adminRestrictions.includes(permission);
    }

    // For members, check if the permission is explicitly granted
    if (
      member.permissions &&
      Array.isArray(member.permissions) &&
      member.permissions.includes(permission)
    ) {
      return true;
    }

    // Default: deny permission
    return false;
  },

  /**
   * Check if the user can edit a specific card
   * @param {Object} board - The board object
   * @param {Object} card - The card object
   * @param {String} userId - The user ID
   * @returns {Boolean} - True if the user can edit the card
   */
  canEditCard(board, card, userId) {
    if (!board || !card || !userId) {
      return false;
    }

    // First check if user has general permission to edit any card
    if (this.hasPermission(board, userId, 'edit_cards')) {
      return true;
    }

    // Check if user created the card or is assigned to it
    if (card.createdBy && card.createdBy.toString() === userId.toString()) {
      return this.hasPermission(board, userId, 'edit_own_cards');
    }

    // Check if user is a card member
    const isCardMember =
      card.members &&
      Array.isArray(card.members) &&
      card.members.some((m) => {
        if (!m || !m.user) return false;

        const memberId =
          typeof m.user === 'object' && m.user !== null
            ? m.user._id
              ? m.user._id.toString()
              : null
            : m.user.toString();

        return memberId === userId.toString();
      });

    if (isCardMember && this.hasPermission(board, userId, 'edit_own_cards')) {
      return true;
    }

    // If none of the above, user can only edit if board allows editing other cards
    return this.hasPermission(board, userId, 'edit_other_cards');
  },

  /**
   * Check if the user can move a specific card between lists
   * @param {Object} board - The board object
   * @param {Object} card - The card object
   * @param {String} userId - The user ID
   * @returns {Boolean} - True if the user can move the card
   */
  canMoveCard(board, card, userId) {
    if (!board || !card || !userId) {
      return false;
    }

    // First check if user has general permission to move any card
    if (this.hasPermission(board, userId, 'move_cards')) {
      return true;
    }

    // Check if user created the card
    if (card.createdBy && card.createdBy.toString() === userId.toString()) {
      return this.hasPermission(board, userId, 'move_own_cards');
    }

    // Check if user is a card member
    const isCardMember =
      card.members &&
      Array.isArray(card.members) &&
      card.members.some((m) => {
        if (!m || !m.user) return false;

        const memberId =
          typeof m.user === 'object' && m.user !== null
            ? m.user._id
              ? m.user._id.toString()
              : null
            : m.user.toString();

        return memberId === userId.toString();
      });

    if (isCardMember && this.hasPermission(board, userId, 'move_own_cards')) {
      return true;
    }

    // If none of the above, user can only move if board allows moving other cards
    return this.hasPermission(board, userId, 'move_other_cards');
  },

  /**
   * Verify that a user has a specific permission, throw error if not
   * @param {Object} board - The board object
   * @param {String} userId - The user ID
   * @param {String} permission - The permission to check
   * @throws {AppError} - If the user doesn't have the permission
   */
  verifyPermission(board, userId, permission) {
    if (!board) {
      throw new AppError('Cannot verify permissions: Board is undefined', 500);
    }

    if (!userId) {
      throw new AppError(
        'Cannot verify permissions: User ID is undefined',
        500
      );
    }

    if (!permission) {
      throw new AppError(
        'Cannot verify permissions: Permission is undefined',
        500
      );
    }

    if (!this.hasPermission(board, userId, permission)) {
      // More specific error message
      const readablePermission = permission.replace(/_/g, ' ');
      throw new AppError(
        `You don't have permission to ${readablePermission}`,
        403
      );
    }
  },

  /**
   * Verify that a user has a specific workspace permission, throw error if not
   * @param {Object} workspace - The workspace object
   * @param {String} userId - The user ID
   * @param {String} permission - The permission to check
   * @throws {AppError} - If the user doesn't have the permission
   */
  verifyWorkspacePermission(workspace, userId, permission) {
    if (!workspace) {
      throw new AppError(
        'Cannot verify permissions: Workspace is undefined',
        500
      );
    }

    if (!userId) {
      throw new AppError(
        'Cannot verify permissions: User ID is undefined',
        500
      );
    }

    if (!permission) {
      throw new AppError(
        'Cannot verify permissions: Permission is undefined',
        500
      );
    }

    if (!this.hasWorkspacePermission(workspace, userId, permission)) {
      const readablePermission = permission.replace(/_/g, ' ');
      throw new AppError(
        `You don't have permission to ${readablePermission}`,
        403
      );
    }
  },

  /**
   * Verify that a user can edit a card, throw error if not
   * @param {Object} board - The board object
   * @param {Object} card - The card object
   * @param {String} userId - The user ID
   * @throws {AppError} - If the user can't edit the card
   */
  verifyCardEdit(board, card, userId) {
    if (!board || !card || !userId) {
      throw new AppError(
        'Missing required parameters for card edit verification',
        500
      );
    }

    if (!this.canEditCard(board, card, userId)) {
      throw new AppError("You don't have permission to edit this card", 403);
    }
  },

  /**
   * Verify that a user can move a card, throw error if not
   * @param {Object} board - The board object
   * @param {Object} card - The card object
   * @param {String} userId - The user ID
   * @throws {AppError} - If the user can't move the card
   */
  verifyCardMove(board, card, userId) {
    if (!board || !card || !userId) {
      throw new AppError(
        'Missing required parameters for card move verification',
        500
      );
    }

    if (!this.canMoveCard(board, card, userId)) {
      throw new AppError("You don't have permission to move this card", 403);
    }
  },
};

module.exports = permissionService;
