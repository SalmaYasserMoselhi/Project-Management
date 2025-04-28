const sendEmail = require('../utils/email');
const User = require('../models/userModel');

// Helper function to send meeting notification emails
const sendMeetingNotifications = async (meeting, attendeeIds) => {
  // Get attendee user details
  const attendeeUsers = await User.find({
    _id: { $in: attendeeIds }
  }).select('email firstName lastName');
  
  if (!attendeeUsers || attendeeUsers.length === 0) {
    console.log('No valid users found for meeting notifications');
    return [];
  }
  
  // Format meeting time for email
  const meetingDate = new Date(meeting.date).toLocaleDateString();
  const meetingTime = `${meeting.time.startTime} - ${meeting.time.endTime}`;
  
  // Get creator information
  const creator = await User.findById(meeting.createdBy).select('firstName lastName username');
  const creatorName = creator ? `${creator.firstName} ${creator.lastName}`.trim() : 'A team member';
  
  // Send email to each attendee
  const sentEmails = [];
  
  for (const user of attendeeUsers) {
    try {
      // Create email content
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Meeting Notification</h2>
          <p>Hello ${user.firstName || 'there'},</p>
          <p>${creatorName} has added you to a meeting in Beehive:</p>
          
          <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${meeting.name}</h3>
            <p><strong>Date:</strong> ${meetingDate}</p>
            <p><strong>Time:</strong> ${meetingTime}</p>
            <p><strong>Online Link:</strong> ${meeting.onlineLink || 'Not provided'}</p>
          </div>
          
          <p style="margin-top: 20px;">This meeting has been added to your schedule in Beehive. Please check the app for more details.</p>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #777;">You can view all your meetings in the Beehive application.</p>
        </div>
      `;
      
      // Send email
      await sendEmail({
        email: user.email,
        subject: `Meeting: ${meeting.name}`,
        message: emailMessage,
      });
      
      sentEmails.push(user.email);
    } catch (err) {
      console.error(`Failed to send meeting notification email to ${user.email}:`, err);
      // Continue with other emails even if one fails
    }
  }
  
  return sentEmails;
};

module.exports = { sendMeetingNotifications };