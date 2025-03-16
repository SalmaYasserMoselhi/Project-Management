/**
 * Centralized service for logging activities across the application
 * All activities are stored in the board model
 */
const activityService = {
  /**
   * Log an activity to the board
   * @param {Object} board - The board object
   * @param {String} userId - The user ID performing the action
   * @param {String} action - The action being performed
   * @param {String} entityType - The type of entity (board, list, card, ...)
   * @param {String} entityId - The ID of the entity
   * @param {Object} data - Additional data to store with the activity
   * @returns {Object} - The created activity
   */
  async logActivity(board, userId, action, entityType, entityId, data = {}) {
    const activity = {
      user: userId,
      action,
      entityType,
      entityId,
      data,
      createdAt: new Date(),
    };

    // Handle both Mongoose documents and plain objects
    if (typeof board.save === 'function') {
      // If it's a Mongoose document with save method
      board.activities.push(activity);
      await board.save();
    } else {
      // If it's a plain object (from lean() query)
      const Board = require('../models/boardModel');
      await Board.findByIdAndUpdate(
        board._id,
        { $push: { activities: activity } }
      );
    }

    return activity;
  },

  /**
   * Log a board-related activity
   * @param {Object} board - The board object
   * @param {String} userId - The user ID performing the action
   * @param {String} action - The action being performed
   * @param {Object} data - Additional data to store with the activity
   */
  async logBoardActivity(board, userId, action, data = {}) {
    return this.logActivity(board, userId, action, 'board', board._id, data);
  },

  /**
   * Log a list-related activity
   * @param {Object} board - The board object
   * @param {String} userId - The user ID performing the action
   * @param {String} action - The action being performed
   * @param {String} listId - The ID of the list
   * @param {Object} data - Additional data to store with the activity
   */
  async logListActivity(board, userId, action, listId, data = {}) {
    return this.logActivity(board, userId, action, 'list', listId, data);
  },

  /**
   * Log a card-related activity
   * @param {Object} board - The board object
   * @param {String} userId - The user ID performing the action
   * @param {String} action - The action being performed
   * @param {String} cardId - The ID of the card
   * @param {Object} data - Additional data to store with the activity
   */
  async logCardActivity(board, userId, action, cardId, data = {}) {
    return this.logActivity(board, userId, action, 'card', cardId, data);
  },

  /**
   * Log a member-related activity
   * @param {Object} board - The board object
   * @param {String} userId - The user ID performing the action
   * @param {String} action - The action being performed
   * @param {String} memberId - The ID of the member
   * @param {Object} data - Additional data to store with the activity
   */
  async logMemberActivity(board, userId, action, memberId, data = {}) {
    return this.logActivity(board, userId, action, 'member', memberId, data);
  },

  /**
   * Log a workspace-related activity
   * @param {Object} workspace - The workspace object
   * @param {String} userId - The user ID performing the action
   * @param {String} action - The action being performed
   * @param {Object} data - Additional data to store with the activity
   */
  async logWorkspaceActivity(workspace, userId, action, data = {}) {
    const activity = {
      user: userId,
      action,
      data,
      createdAt: new Date(),
    };

    // Handle both Mongoose documents and plain objects
    if (typeof workspace.save === 'function') {
      // If it's a Mongoose document with save method
      workspace.activities.push(activity);
      await workspace.save();
    } else {
      // If it's a plain object (from lean() query)
      const Workspace = require('../models/workspaceModel');
      await Workspace.findByIdAndUpdate(
        workspace._id,
        { $push: { activities: activity } }
      );
    }

    return activity;
  },

  /**
   * Get all activities for a board
   * @param {String} boardId - The ID of the board
   * @param {Object} filters - Filters to apply
   * @returns {Array} - The board activities
   */
  async getBoardActivities(boardId, filters = {}) {
    const Board = require('../models/boardModel');
    const board = await Board.findById(boardId).populate({
      path: 'activities.user',
      select: 'name email username avatar',
    });

    if (!board) return [];

    let activities = board.activities;

    // Apply filters if any
    if (filters.entityType) {
      activities = activities.filter(
        (a) => a.entityType === filters.entityType
      );
    }

    if (filters.action) {
      activities = activities.filter((a) => a.action === filters.action);
    }

    if (filters.userId) {
      activities = activities.filter(
        (a) => a.user && a.user._id.toString() === filters.userId
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      activities = activities.filter((a) => new Date(a.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      activities = activities.filter((a) => new Date(a.createdAt) <= toDate);
    }

    return activities.sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Get all activities for a workspace
   * @param {String} workspaceId - The ID of the workspace
   * @param {Object} filters - Filters to apply
   * @returns {Array} - The workspace activities
   */
  async getWorkspaceActivities(workspaceId, filters = {}) {
    const Workspace = require('../models/workspaceModel');
    const workspace = await Workspace.findById(workspaceId).populate({
      path: 'activities.user',
      select: 'name email username avatar',
    });

    if (!workspace) return [];

    let activities = workspace.activities || [];

    // Apply filters if any
    if (filters.action) {
      activities = activities.filter((a) => a.action === filters.action);
    }

    if (filters.userId) {
      activities = activities.filter(
        (a) => a.user && a.user._id.toString() === filters.userId
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      activities = activities.filter((a) => new Date(a.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      activities = activities.filter((a) => new Date(a.createdAt) <= toDate);
    }

    return activities.sort((a, b) => b.createdAt - a.createdAt);
  }
};

module.exports = activityService;