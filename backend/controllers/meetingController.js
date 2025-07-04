const Meeting = require('../models/meetingModel');
const Board = require('../models/boardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const permissionService = require('../utils/permissionService');
const activityService = require('../utils/activityService');
const notificationService = require('../utils/notificationService');
const { sendMeetingNotifications } = require('../utils/meetingEmailService');

// Helper function to get board and verify permissions
const getBoardAndVerifyPermission = async (boardId, userId) => {
  const board = await Board.findById(boardId);

  if (!board) {
    throw new AppError('Board not found', 404);
  }

  // Verify user is a board member
  const isMember = board.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (!isMember) {
    throw new AppError('You must be a board member to access meetings', 403);
  }

  return board;
};

// Create a new meeting (without attendees)
exports.createMeeting = catchAsync(async (req, res, next) => {
  const { name, date, time, onlineLink, color, board: boardId } = req.body;

  // Verify board access
  const board = await getBoardAndVerifyPermission(boardId, req.user._id);

  // Create the meeting with only the creator as an attendee
  const meeting = await Meeting.create({
    name,
    date,
    time,
    onlineLink,
    color,
    attendees: [
      {
        user: req.user._id,
        addedBy: req.user._id,
      },
    ],
    board: boardId,
    createdBy: req.user._id,
    reminderSent: false
  });

  // Log activity
  await activityService.logBoardActivity(
    board,
    req.user._id,
    'meeting_created',
    {
      meetingId: meeting._id,
      meetingName: meeting.name,
    }
  );

  // Return the created meeting
  const createdMeeting = await Meeting.findById(meeting._id)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar')
    .populate('board', 'name');

  // Get board members to notify about the new meeting (excluding creator)
  const boardMembers = board.members
    .filter((member) => member.user.toString() !== req.user._id.toString())
    .map((member) => member.user);

  // Notify board members about the new meeting
  for (const memberId of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      memberId,
      req.user._id,
      'meeting_created',
      'meeting',
      meeting._id,
      {
        meetingTitle: meeting.name,
        boardId: board._id,
        boardName: board.name,
        meetingDate: meeting.date,
        meetingTime: meeting.time,
      }
    );
  }
  res.status(201).json({
    status: 'success',
    data: {
      meeting: createdMeeting,
    },
  });
});

// Delete a meeting
exports.deleteMeeting = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find meeting
  const meeting = await Meeting.findById(id);

  if (!meeting) {
    return next(new AppError('Meeting not found', 404));
  }

  // Verify board access
  const board = await getBoardAndVerifyPermission(meeting.board, req.user._id);

  // Check if user is the creator or has admin/owner permissions
  const isCreator = meeting.createdBy.toString() === req.user._id.toString();
  const hasAdminPermissions = permissionService.hasPermission(
    board,
    req.user._id,
    'manage_board'
  );

  if (!isCreator && !hasAdminPermissions) {
    return next(
      new AppError(
        'Only meeting creator or board admin can delete meetings',
        403
      )
    );
  }

  // Get meeting attendees to notify (excluding the user deleting the meeting)
  const attendees = meeting.attendees
    .filter((attendee) => attendee.user.toString() !== req.user._id.toString())
    .map((attendee) => attendee.user);

  // Notify attendees about the meeting deletion
  for (const attendeeId of attendees) {
    await notificationService.createNotification(
      req.app.io,
      attendeeId,
      req.user._id,
      'meeting_deleted',
      'board', // Changed to board since meeting will be deleted
      board._id,
      {
        meetingTitle: meeting.name,
        boardId: board._id,
        boardName: board.name,
      }
    );
  }

  // Delete the meeting
  await Meeting.findByIdAndDelete(id);

  // Log activity
  await activityService.logBoardActivity(
    board,
    req.user._id,
    'meeting_deleted',
    {
      meetingName: meeting.name,
    }
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Update a meeting (basic details only, not attendees)
exports.updateMeeting = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, date, time, onlineLink, color } = req.body;

  // Find meeting
  const meeting = await Meeting.findById(id);

  if (!meeting) {
    return next(new AppError('Meeting not found', 404));
  }

  // Verify board access
  const board = await getBoardAndVerifyPermission(meeting.board, req.user._id);

  // Check if user is the creator or has admin/owner permissions
  const isCreator = meeting.createdBy.toString() === req.user._id.toString();
  const hasAdminPermissions = permissionService.hasPermission(
    board,
    req.user._id,
    'manage_board'
  );

  if (!isCreator && !hasAdminPermissions) {
    return next(
      new AppError(
        'Only meeting creator or board admin can update meetings',
        403
      )
    );
  }

  const timeChanged = date || time;

  // Update basic fields if provided
  if (name) meeting.name = name;
  if (date) meeting.date = date;
  if (time) meeting.time = time;
  if (onlineLink !== undefined) meeting.onlineLink = onlineLink;
  if (color) meeting.color = color;

   // Reset reminder flag if time changed
  if (timeChanged) {
    meeting.reminderSent = false;
  }
  
  meeting.updatedBy = req.user._id;
  await meeting.save();

  // Log activity
  await activityService.logBoardActivity(
    board,
    req.user._id,
    'meeting_updated',
    {
      meetingId: meeting._id,
      meetingName: meeting.name,
    }
  );

  // Return updated meeting
  const updatedMeeting = await Meeting.findById(id)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar');

  // Get meeting attendees to notify (excluding the user updating the meeting)
  const attendees = meeting.attendees
    .filter((attendee) => attendee.user.toString() !== req.user._id.toString())
    .map((attendee) => attendee.user);

  // Notify attendees about the meeting update
  for (const attendeeId of attendees) {
    await notificationService.createNotification(
      req.app.io,
      attendeeId,
      req.user._id,
      'meeting_updated',
      'meeting',
      meeting._id,
      {
        meetingTitle: meeting.name,
        boardId: board._id,
        boardName: board.name,
        updatedFields: Object.keys(req.body),
        timeChanged
      }
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      meeting: updatedMeeting,
    },
  });
});

// Get all meetings where the current user is an attendee
exports.getUserMeetings = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Optional query parameters for filtering and sorting
  const {
    startDate,
    endDate,
    sort = '-date', // Default to most recent first
    limit = 50,
    page = 1,
  } = req.query;

  // Build query to find meetings where user is an attendee
  let query = {
    'attendees.user': userId,
  };

  // Add date filtering if provided
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Query meetings
  const meetings = await Meeting.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(skip)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar')
    .populate('board', 'name')
    .lean();

  // Get total count for pagination
  const total = await Meeting.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: meetings.length,
    totalResults: total,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    data: {
      meetings,
    },
  });
});

// Get upcoming meetings for the current week (next 7 days)
exports.getUpcomingMeetings = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Calculate date range for the next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7); // 7 days from today
  nextWeek.setHours(23, 59, 59, 999); // End of the 7th day

  // Build query to find upcoming meetings where user is an attendee
  const query = {
    'attendees.user': userId,
    date: {
      $gte: today,
      $lte: nextWeek,
    },
  };

  // Query meetings sorted by date and time
  const meetings = await Meeting.find(query)
    .sort('date time.startTime') // Sort by date first, then by start time
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar')
    .populate('board', 'name')
    .lean();

  // Group meetings by date for better organization
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const dateKey = meeting.date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: meeting.date,
        meetings: [],
      };
    }

    acc[dateKey].meetings.push(meeting);
    return acc;
  }, {});

  // Convert grouped meetings to array and sort by date
  const organizedMeetings = Object.values(groupedMeetings).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  res.status(200).json({
    status: 'success',
    results: meetings.length,
    dateRange: {
      from: today,
      to: nextWeek,
    },
    data: {
      meetings, // All meetings in flat array
      organizedByDate: organizedMeetings, // Grouped by date
    },
  });
});

// Get all meetings for a board
exports.getBoardMeetings = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;

  // Optional query parameters
  const { startDate, endDate, sort = 'date' } = req.query;

  // Verify board access
  await getBoardAndVerifyPermission(boardId, req.user._id);

  // Build query
  let query = { board: boardId };

  // Add date filtering if provided
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Query meetings
  const meetings = await Meeting.find(query)
    .sort(sort)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar')
    .lean();

  res.status(200).json({
    status: 'success',
    results: meetings.length,
    data: {
      meetings,
    },
  });
});

// Get all meetings for a board
exports.getBoardMeetings = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;

  // Optional query parameters
  const { startDate, endDate, sort = 'date' } = req.query;

  // Verify board access
  await getBoardAndVerifyPermission(boardId, req.user._id);

  // Build query
  let query = { board: boardId };

  // Add date filtering if provided
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Query meetings
  const meetings = await Meeting.find(query)
    .sort(sort)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar')
    .lean();

  res.status(200).json({
    status: 'success',
    results: meetings.length,
    data: {
      meetings,
    },
  });
});

// Get a single meeting
exports.getMeeting = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const meeting = await Meeting.findById(id)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar')
    .populate('board', 'name');

  if (!meeting) {
    return next(new AppError('Meeting not found', 404));
  }

  // Verify board access
  await getBoardAndVerifyPermission(meeting.board._id, req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      meeting,
    },
  });
});

// Add attendees to a meeting
exports.addAttendees = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { attendees } = req.body;

  if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
    return next(new AppError('Please provide at least one attendee', 400));
  }

  // Find meeting
  const meeting = await Meeting.findById(id);

  if (!meeting) {
    return next(new AppError('Meeting not found', 404));
  }

  // Verify board access
  const board = await getBoardAndVerifyPermission(meeting.board, req.user._id);

  // Check if user is the creator or has admin/owner permissions
  const isCreator = meeting.createdBy.toString() === req.user._id.toString();
  const hasAdminPermissions = permissionService.hasPermission(
    board,
    req.user._id,
    'manage_board'
  );

  if (!isCreator && !hasAdminPermissions) {
    return next(
      new AppError('Only meeting creator or board admin can add attendees', 403)
    );
  }

  // Verify attendees are board members
  const boardMemberIds = board.members.map((member) => member.user.toString());

  for (const attendeeId of attendees) {
    if (!boardMemberIds.includes(attendeeId)) {
      return next(new AppError('All attendees must be board members', 400));
    }
  }

  // Filter out users that are already attendees
  const existingAttendeeIds = meeting.attendees.map((attendee) =>
    attendee.user.toString()
  );

  const newAttendees = attendees.filter(
    (attendeeId) => !existingAttendeeIds.includes(attendeeId)
  );

  if (newAttendees.length === 0) {
    return next(new AppError('All users are already attendees', 400));
  }

  // Add new attendees
  const formattedAttendees = newAttendees.map((userId) => ({
    user: userId,
    addedBy: req.user._id,
    addedAt: Date.now(),
  }));

  // Add the new attendees to the existing array
  meeting.attendees.push(...formattedAttendees);
  await meeting.save();

  // Send email notifications to new attendees
  try {
    const sentEmails = await sendMeetingNotifications(meeting, newAttendees);
    console.log(
      `Sent ${sentEmails.length} notification emails to new attendees`
    );
  } catch (error) {
    console.error('Failed to send notification emails:', error);
    // Continue even if emails fail
  }

  // Log activity
  await activityService.logBoardActivity(
    board,
    req.user._id,
    'meeting_attendees_added',
    {
      meetingId: meeting._id,
      meetingName: meeting.name,
      attendeesCount: newAttendees.length,
    }
  );

  // Return updated meeting
  const updatedMeeting = await Meeting.findById(id)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar');

  // Send notifications to each new attendee
  for (const attendeeId of newAttendees) {
    // Skip sending notification if the attendee is the same as the user adding them
    if (attendeeId !== req.user._id.toString()) {
      await notificationService.createNotification(
        req.app.io,
        attendeeId,
        req.user._id,
        'meeting_attendees_added',
        'meeting',
        meeting._id,
        {
          meetingTitle: meeting.name,
          boardId: board._id,
          boardName: board.name,
          meetingDate: meeting.date,
          meetingTime: meeting.time,
        }
      );
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      meeting: updatedMeeting,
      addedAttendees: {
        count: newAttendees.length,
        ids: newAttendees,
      },
    },
  });
});

// Remove attendee
exports.removeAttendee = catchAsync(async (req, res, next) => {
  const { id, userId } = req.params;

  // Find meeting
  const meeting = await Meeting.findById(id);

  if (!meeting) {
    return next(new AppError('Meeting not found', 404));
  }

  // Verify board access
  const board = await getBoardAndVerifyPermission(meeting.board, req.user._id);

  // Check if user is the creator or has admin/owner permissions
  const isCreator = meeting.createdBy.toString() === req.user._id.toString();
  const hasAdminPermissions = permissionService.hasPermission(
    board,
    req.user._id,
    'manage_board'
  );

  if (!isCreator && !hasAdminPermissions) {
    return next(
      new AppError(
        'Only meeting creator or board admin can remove attendees',
        403
      )
    );
  }

  // Find attendee
  const attendeeIndex = meeting.attendees.findIndex(
    (attendee) => attendee.user.toString() === userId
  );

  if (attendeeIndex === -1) {
    return next(new AppError('Attendee not found', 404));
  }

  // Prevent removal of the meeting creator
  if (meeting.createdBy.toString() === userId) {
    return next(new AppError('Cannot remove meeting creator', 400));
  }
  if (userId !== req.user._id.toString()) {
    // Send notification to the removed attendee
    await notificationService.createNotification(
      req.app.io,
      userId,
      req.user._id,
      'meeting_attendee_removed',
      'meeting',
      meeting._id,
      {
        meetingTitle: meeting.name,
        boardId: board._id,
        boardName: board.name,
      }
    );
  }
  // Remove attendee
  meeting.attendees.splice(attendeeIndex, 1);
  await meeting.save();

  // Log activity
  await activityService.logBoardActivity(
    board,
    req.user._id,
    'meeting_attendee_removed',
    {
      meetingId: meeting._id,
      meetingName: meeting.name,
      removedAttendee: userId,
    }
  );

  // Return updated meeting
  const updatedMeeting = await Meeting.findById(id)
    .populate('createdBy', 'firstName lastName username avatar')
    .populate('attendees.user', 'firstName lastName username avatar');

  res.status(200).json({
    status: 'success',
    data: {
      meeting: updatedMeeting,
    },
  });
});
