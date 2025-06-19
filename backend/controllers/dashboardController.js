// In your dashboardController.js (create this file if it doesn't exist)
const Card = require('../models/cardModel');
const catchAsync = require('../utils/catchAsync');
const Board = require('../models/boardModel')
const List = require('../models/listModel')
const AppError = require('../utils/appError');

exports.getHighPriorityTasks = catchAsync(async (req, res, next) => {
  try {
    // 1. Get all boards where user is a member
    const boards = await Board.find({
      'members.user': req.user._id
    }).select('_id name');

    if (!boards || boards.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: []
      });
    }

    const boardIds = boards.map(board => board._id);

    // 2. Get all lists from these boards
    const lists = await List.find({
      board: { $in: boardIds }
    }).select('_id name board');

    if (!lists || lists.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: []
      });
    }

    // 3. Find all high priority cards with member details
    const highPriorityCards = await Card.find({
      list: { $in: lists.map(l => l._id) },
      priority: 'high',
      archived: false
    })
      .sort('-createdAt')
      .populate({
        path: 'list',
        select: 'name board',
        options: { lean: true }
      })
      .populate('createdBy', 'firstName lastName avatar')
      .populate('members.user', 'firstName lastName avatar')
      .lean();

    // 4. Format the response with proper null checks
    const formattedCards = highPriorityCards.map(card => {
      // Safely get list and board info
      const list = card.list ? lists.find(l => l._id.equals(card.list._id)) : null;
      const board = list && list.board ? boards.find(b => b._id.equals(list.board)) : null;

      // Format members safely
      const formattedMembers = (card.members || []).map(member => {
        if (!member || !member.user) return null;
        return {
          id: member.user._id,
          name: `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim(),
          avatar: member.user.avatar || null,
          assignedAt: member.assignedAt || null
        };
      }).filter(member => member !== null);

      return {
        id: card._id,
        title: card.title || 'Untitled Task',
        priority: card.priority || 'high',
        board: board ? {
          id: board._id,
          name: board.name || 'Unnamed Board'
        } : null,
        list: list ? {
          id: list._id,
          name: list.name || 'Unnamed List'
        } : null,
        createdAt: card.createdAt || new Date(),
        timeAgo: getTimeAgo(card.createdAt || new Date()),
        createdBy: card.createdBy ? {
          firstName: card.createdBy.firstName || '',
          lastName: card.createdBy.lastName || '',
          avatar: card.createdBy.avatar || null
        } : null,
        members: formattedMembers,
        dueDate: card.dueDate?.endDate || null
      };
    });

    res.status(200).json({
      status: 'success',
      results: formattedCards.length,
      data: {
        tasks: formattedCards
      }
    });

  } catch (err) {
    console.error('Error in getHighPriorityTasks:', err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching high priority tasks'
    });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  return 'Just now';
}

exports.getCalendarDeadlines = catchAsync(async (req, res, next) => {
  // Get user's timezone from request or default to Egypt timezone
  const userTimezone = req.user.timezone || 'Africa/Cairo';
  
  // 1. Get date from query params (default to today if not provided)
  const dateString = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: userTimezone });
  
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return next(new AppError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  // 2. Create start and end of the selected day in user's timezone
  const startOfDay = new Date(`${dateString}T00:00:00`);
  const endOfDay = new Date(`${dateString}T23:59:59.999`);

  // Convert to UTC for database query
  const utcStart = new Date(startOfDay.getTime() - (getTimezoneOffset(userTimezone) * 60000));
  const utcEnd = new Date(endOfDay.getTime() - (getTimezoneOffset(userTimezone) * 60000));

  // 3. Get all boards where user is a member
  const boards = await Board.find({
    'members.user': req.user._id
  }).select('_id');

  if (!boards || boards.length === 0) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: []
    });
  }

  const boardIds = boards.map(board => board._id);

  // 4. Get all lists from these boards
  const lists = await List.find({
    board: { $in: boardIds }
  }).select('_id');

  const listIds = lists.map(list => list._id);

  // 5. Find cards due on the selected date
  const calendarDeadlines = await Card.find({
    list: { $in: listIds },
    'dueDate.endDate': {
      $gte: utcStart,
      $lte: utcEnd
    },
    archived: false
  })
    .sort('dueDate.endDate')
    .populate({
      path: 'list',
      select: 'name',
      populate: {
        path: 'board',
        select: 'name'
      }
    })
    .populate('members.user', 'firstName lastName avatar')
    .populate('createdBy', 'firstName lastName avatar');

  // 6. Format the response
  const formattedDeadlines = calendarDeadlines.map(card => {
    const dueDate = new Date(card.dueDate.endDate);
    
    return {
      id: card._id,
      title: card.title,
      dueTime: dueDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: userTimezone 
      }),
      dueDateTime: dueDate,
      boardId: card.list.board._id,
      boardName: card.list.board.name,
      listName: card.list.name,
      priority: card.priority,
      members: card.members.map(m => ({
        id: m.user._id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        avatar: m.user.avatar
      })),
      createdBy: card.createdBy
    };
  });

  res.status(200).json({
    status: 'success',
    date: dateString,
    results: formattedDeadlines.length,
    data: {
      deadlines: formattedDeadlines
    }
  });
});

exports.getActivityLog = catchAsync(async (req, res, next) => {
  // Get user's timezone
  const userTimezone = req.user.timezone || 'Africa/Cairo';
  
  // Add sorting parameters
  const sortBy = req.query.sortBy || 'createdAt'; // createdAt, action, entityType
  const sortOrder = req.query.sortOrder || 'desc'; // asc or desc

  // Validate sort parameters
  const validSortFields = ['createdAt', 'action', 'entityType'];
  const validSortOrders = ['asc', 'desc'];

  if (!validSortFields.includes(sortBy)) {
    return next(new AppError('Invalid sort field. Use: createdAt, action, or entityType', 400));
  }
  
  if (!validSortOrders.includes(sortOrder)) {
    return next(new AppError('Invalid sort order. Use: asc or desc', 400));
  }

  // 2. Get all boards where user is a member
  const boards = await Board.find({
    'members.user': req.user._id
  }).select('_id name');

  if (!boards || boards.length === 0) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      sortBy,
      sortOrder,
      data: {
        activities: []
      }
    });
  }

  const boardIds = boards.map(board => board._id);

  // 3. Build sort object for aggregation
  const sortObject = {};
  sortObject[`activities.${sortBy}`] = sortOrder === 'asc' ? 1 : -1;

  // 4. Aggregate activities from all boards
  const activities = await Board.aggregate([
    { $match: { _id: { $in: boardIds } } },
    { $unwind: '$activities' },
    { $sort: { 'activities.createdAt': -1 } },
    { $sort: sortObject },
    { 
      $lookup: {
        from: 'users',
        localField: 'activities.user',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
       $project: {
        _id: 0,
        id: '$activities._id',
        action: '$activities.action',
        entityType: '$activities.entityType',
        entityId: '$activities.entityId',
        entityName: '$activities.data.entityName',
        data: '$activities.data',
        createdAt: '$activities.createdAt',
        user: {
          $cond: {
            if: '$user',
            then: {
              id: '$user._id',
              name: { 
                $trim: { 
                  input: { $concat: [
                    { $ifNull: ['$user.firstName', ''] }, 
                    ' ', 
                    { $ifNull: ['$user.lastName', ''] }
                  ]}
                }
              },
              avatar: '$user.avatar'
            },
            else: {
              id: null,
              name: 'Unknown User',
              avatar: null
            }
          }
        },
        board: {
          id: '$_id',
          name: '$name'
        }
      }
    }
  ]);

  // 5. Format action types for display and add time formatting
  const formattedActivities = activities.map(activity => {
    return {
      ...activity,
      actionText: getActionText(activity.action, activity.entityType, activity.entityName),
      timestamp: activity.createdAt,
      // Format date in user's timezone
      formattedDate: formatActivityDate(activity.createdAt, userTimezone),
      // Add relative time
      timeAgo: getTimeAgo(activity.createdAt),
      // Add date grouping for UI
      dateGroup: getDateGroup(activity.createdAt, userTimezone)
    };
  });

  res.status(200).json({
    status: 'success',
    results: formattedActivities.length,
    sortBy,
    sortOrder,
    data: {
      activities: formattedActivities
    }
  });
});

// Helper function to convert action types to display text
function getActionText(action, entityType, entityName) {  // Fixed: Added entityName parameter
  const actionMap = {
    'card_created': `created ${entityType}`,
    'card_updated': `updated ${entityType}`,
    'card_moved': `moved ${entityType}`,
    'card_deleted': `deleted ${entityType}`,
    'card_archived': `archived ${entityType}`,
    'card_restored': `restored ${entityType}`,
    'card_assigned': `assigned ${entityType}`,
    'card_unassigned': `unassigned ${entityType}`,
    'card_due_date_set': `set due date for ${entityType}`,
    'card_due_date_changed': `changed due date for ${entityType}`,
    'card_due_date_removed': `removed due date from ${entityType}`,
    'card_priority_changed': `changed priority of ${entityType}`,
    'card_comment_added': `commented on ${entityType}`,
    'card_attachment_added': `added attachment to ${entityType}`,
    'card_checklist_added': `added checklist to ${entityType}`,
    'card_checklist_item_completed': `completed checklist item in ${entityType}`,
    'list_created': `created ${entityType}`,
    'list_updated': `updated ${entityType}`,
    'list_deleted': `deleted ${entityType}`,
    'list_archived': `archived ${entityType}`,
    'list_moved': `moved ${entityType}`,
    'member_added': `added member to ${entityType}`,
    'member_removed': `removed member from ${entityType}`,
    'board_created': `created ${entityType}`,
    'board_updated': `updated ${entityType}`,
    'board_deleted': `deleted ${entityType}`,
    'board_archived': `archived ${entityType}`,
    'board_restored': `restored ${entityType}`
  };

  let actionText = actionMap[action] || `${action.replace(/_/g, ' ')} ${entityType}`;
  
  // Add entity name if available
  if (entityName) {
    actionText += ` "${entityName}"`;
  }

  return actionText;
}

// Helper function to format date in user's timezone
function formatActivityDate(date, timezone = 'Africa/Cairo') {
  return new Date(date).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
}

// Helper function to group activities by date for UI display
function getDateGroup(date, timezone = 'Africa/Cairo') {
  const activityDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format dates in user's timezone
  const activityDateStr = activityDate.toLocaleDateString('en-CA', { timeZone: timezone });
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: timezone });
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: timezone });
  
  if (activityDateStr === todayStr) {
    return 'Today';
  } else if (activityDateStr === yesterdayStr) {
    return 'Yesterday';
  } else {
    return activityDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: timezone 
    });
  }
}

exports.getTaskStats = catchAsync(async (req, res, next) => {
  // Get user's timezone
  const userTimezone = req.user.timezone || 'Africa/Cairo';
  
  // 1. Get period from query (weekly/monthly/yearly)
  const period = req.query.period || 'weekly';
  const validPeriods = ['weekly', 'monthly', 'yearly'];
  
  if (!validPeriods.includes(period)) {
    return next(new AppError('Invalid period. Use weekly, monthly, or yearly', 400));
  }

  // 2. Get date ranges based on user's timezone
  const { startDate, endDate, intervals } = getDateRange(period, userTimezone);

  // 3. Get all boards where user is a member
  const boards = await Board.find({
    'members.user': req.user._id
  }).select('_id');

  if (!boards || boards.length === 0) {
    return emptyStatsResponse(res, period, intervals);
  }

  const boardIds = boards.map(board => board._id);

  // 4. Get all lists from these boards
  const lists = await List.find({
    board: { $in: boardIds }
  }).select('_id');

  const listIds = lists.map(list => list._id);

  // 5. Get all cards (for total count)
  const totalCards = await Card.countDocuments({
    list: { $in: listIds },
    archived: false
  });

  // 6. Get completed cards grouped by time period
  const completedStats = await Card.aggregate([
    {
      $match: {
        list: { $in: listIds },
        archived: false,
        'state.current': 'completed',
        'state.completedAt': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $addFields: {
        // Convert UTC completion time to user's timezone for grouping
        localCompletedAt: {
          $dateAdd: {
            startDate: '$state.completedAt',
            unit: 'millisecond',
            amount: getTimezoneOffset(userTimezone) * 60000
          }
        }
      }
    },
    {
      $group: {
        _id: getGroupingExpression(period),
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 7. Format the response
  const stats = buildStatsResponse(period, intervals, completedStats, totalCards);

  res.status(200).json({
    status: 'success',
    data: stats
  });
});

// Fixed helper functions for getTaskStats

function getDateRange(period, timezone = 'Africa/Cairo') {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date();
  const intervals = [];

  switch (period) {
    case 'weekly':
      startDate.setDate(endDate.getDate() - 6); // 7 days total including today
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        intervals.push(date.toLocaleDateString('en-CA', { timeZone: timezone }));
      }
      break;
      
    case 'monthly':
      startDate.setDate(endDate.getDate() - 29); // 30 days total
      // Create 5 week intervals
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(endDate);
        weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
        const weekEnd = new Date(endDate);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        
        intervals.push({
          label: `Week ${5 - i}`,
          start: weekStart.toLocaleDateString('en-CA', { timeZone: timezone }),
          end: weekEnd.toLocaleDateString('en-CA', { timeZone: timezone })
        });
      }
      break;
      
    case 'yearly':
      startDate.setFullYear(endDate.getFullYear() - 1);
      startDate.setMonth(endDate.getMonth() + 1); // Start from next month of last year
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(endDate);
        date.setMonth(date.getMonth() - i);
        intervals.push({
          label: date.toLocaleString('default', { month: 'short', timeZone: timezone }),
          year: date.getFullYear(),
          month: date.getMonth() + 1, // 1-based month
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        });
      }
      break;
  }

  return { startDate, endDate, intervals };
}

function getGroupingExpression(period) {
  switch (period) {
    case 'weekly':
      return { $dateToString: { format: "%Y-%m-%d", date: "$localCompletedAt" } };
      
    case 'monthly':
      // Group by week number within the period
      return {
        $dateToString: { 
          format: "%Y-%m-%d", 
          date: {
            $dateFromParts: {
              year: { $year: "$localCompletedAt" },
              month: { $month: "$localCompletedAt" },
              day: { $dayOfMonth: "$localCompletedAt" }
            }
          }
        }
      };
      
    case 'yearly':
      // Group by year-month
      return {
        $dateToString: { 
          format: "%Y-%m", 
          date: "$localCompletedAt" 
        }
      };
  }
}

function buildStatsResponse(period, intervals, completedStats, totalCards) {
  let stats = [];
  
  if (period === 'weekly') {
    // Direct mapping for weekly
    const completedMap = {};
    completedStats.forEach(stat => {
      completedMap[stat._id] = stat.count;
    });
    
    stats = intervals.map(interval => ({
      period: interval,
      completed: completedMap[interval] || 0
    }));
    
  } else if (period === 'monthly') {
    // Group daily completions into weeks
    const completedMap = {};
    completedStats.forEach(stat => {
      completedMap[stat._id] = stat.count;
    });
    
    stats = intervals.map(weekInterval => {
      let weekTotal = 0;
      
      // Sum up all days in this week range
      const startDate = new Date(weekInterval.start);
      const endDate = new Date(weekInterval.end);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toLocaleDateString('en-CA');
        weekTotal += completedMap[dateKey] || 0;
      }
      
      return {
        period: weekInterval.label,
        completed: weekTotal
      };
    });
    
  } else if (period === 'yearly') {
    // Direct mapping for yearly (month-based)
    const completedMap = {};
    completedStats.forEach(stat => {
      completedMap[stat._id] = stat.count;
    });
    
    stats = intervals.map(monthInterval => ({
      period: monthInterval.label,
      completed: completedMap[monthInterval.key] || 0
    }));
  }

  const totalCompleted = stats.reduce((sum, item) => sum + item.completed, 0);
  const completionRate = totalCards > 0 ? Math.round((totalCompleted / totalCards) * 100) : 0;

  return {
    period,
    totalCards,
    totalCompleted,
    completionRate: `${completionRate}%`,
    breakdown: stats
  };
}

function emptyStatsResponse(res, period, intervals) {
  let stats = [];
  
  if (period === 'weekly') {
    stats = intervals.map(interval => ({
      period: interval,
      completed: 0
    }));
  } else if (period === 'monthly') {
    stats = intervals.map(interval => ({
      period: interval.label,
      completed: 0
    }));
  } else if (period === 'yearly') {
    stats = intervals.map(interval => ({
      period: interval.label,
      completed: 0
    }));
  }

  return res.status(200).json({
    status: 'success',
    data: {
      period,
      totalCards: 0,
      totalCompleted: 0,
      completionRate: "0%",
      breakdown: stats
    }
  });
}
// Helper function to get timezone offset in minutes
function getTimezoneOffset(timezone) {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
}