const cron = require('node-cron');
const mongoose = require('mongoose');
const Card = require('../models/cardModel');
const notificationService = require('./notificationService');

/**
 * Send notifications for cards that are due soon (within 24 hours)
 */
const sendDueSoonNotifications = async () => {
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find cards that are:
    // 1. Not completed
    // 2. Have a due date within the next 24 hours
    // 3. Have not already triggered a due soon notification
    const cards = await Card.find({
      'state.current': { $ne: 'completed' },
      'dueDate.endDate': { $gt: now, $lte: twentyFourHoursLater },
      $or: [
        { 'dueDate.notifiedDueSoon': { $exists: false } },
        { 'dueDate.notifiedDueSoon': false }
      ]
    }).populate({
      path: 'members.user',
      select: '_id'
    }).populate({
      path: 'list',
      select: 'board name',
      populate: {
        path: 'board',
        select: 'name'
      }
    });
    
    console.log(`Found ${cards.length} cards due soon`);
    
    for (const card of cards) {
      // For each card member, send a notification
      for (const member of card.members) {
        await notificationService.createNotification(
          global.io,
          member.user._id,
          card.createdBy,
          'card_due_soon',
          'card',
          card._id,
          {
            cardTitle: card.title,
            boardId: card.list.board._id,
            boardName: card.list.board.name,
            listId: card.list._id,
            listName: card.list.name,
            dueDate: card.dueDate.endDate
          }
        );
      }
      
      // Mark that we've sent the notification
      await Card.findByIdAndUpdate(card._id, {
        'dueDate.notifiedDueSoon': true
      });
    }
  } catch (error) {
    console.error('Error sending due soon notifications:', error);
  }
};

// Run every hour to check for cards due soon
cron.schedule('0 * * * *', sendDueSoonNotifications);

module.exports = {
  sendDueSoonNotifications
};