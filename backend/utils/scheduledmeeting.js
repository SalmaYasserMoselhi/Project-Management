const Meeting = require('../models/meetingModel');
const notificationService = require('./notificationService');
const moment = require('moment');

async function checkUpcomingMeetings() {
  try {
    console.log('Running meeting reminder check...');
    
    // Get current time and 1 hour from now
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Find meetings starting between now and 1 hour from now
    const upcomingMeetings = await Meeting.find({
      date: { $lte: oneHourLater },
      'time.startTime': {
        $gte: moment(now).format('HH:mm'),
        $lte: moment(oneHourLater).format('HH:mm')
      },
      reminderSent: { $ne: true }
    })
    .populate({
      path: 'attendees.user',
      select: 'firstName lastName username avatar',
      model: 'User'
    })
    .populate({
      path: 'board',
      select: 'name',
      model: 'Board'
    })
    .populate({
      path: 'createdBy',
      select: 'firstName lastName username avatar',
      model: 'User'
    });

    console.log(`Found ${upcomingMeetings.length} meetings needing reminders`);

    for (const meeting of upcomingMeetings) {
      // Skip if meeting is not properly populated
      if (!meeting || !meeting.attendees || !meeting.board || !meeting.createdBy) {
        console.warn('Skipping invalid meeting data:', meeting);
        continue;
      }

      console.log(`Processing meeting: ${meeting.name} (ID: ${meeting._id})`);

      // Send reminder to each attendee
      for (const attendee of meeting.attendees) {
        if (!attendee.user) {
          console.warn('Skipping invalid attendee:', attendee);
          continue;
        }

        try {
          await notificationService.createNotification(
            global.io,
            attendee.user._id,
            meeting.createdBy._id,
            'meeting_reminder',
            'meeting',
            meeting._id,
            {
              meetingTitle: meeting.name,
              boardId: meeting.board._id,
              boardName: meeting.board.name,
              meetingDate: meeting.date,
              meetingTime: meeting.time
            }
          );
          console.log(`Reminder sent to user ${attendee.user._id}`);
        } catch (error) {
          console.error(`Failed to send reminder to user ${attendee.user?._id}:`, error);
        }
      }

      // Mark meeting as having reminders sent
      try {
        meeting.reminderSent = true;
        await meeting.save();
        console.log(`Marked meeting ${meeting._id} as reminder sent`);
      } catch (error) {
        console.error(`Failed to update meeting ${meeting._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in meeting reminder task:', error);
  }
}

module.exports = function initScheduledTasks() {
  // Check every 15 minutes (adjust as needed)
  const intervalMinutes = 15;
  setInterval(checkUpcomingMeetings, intervalMinutes * 60 * 1000);
  console.log(`Meeting reminder service started. Checking every ${intervalMinutes} minutes.`);
  
  // Also run immediately on startup
  checkUpcomingMeetings();
};