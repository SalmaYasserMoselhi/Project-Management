const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create Gmail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_APP_PASSWORD, // App Password from Google Account
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Email options with HTML template
  const mailOptions = {
    from: {
      name: 'Beehive',
      address: process.env.GMAIL_USERNAME,
    },
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  try {
    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${options.email}`);
  } catch (err) {
    console.error('Error sending email:', err);
    throw new Error('There was an error sending the email. Try again later.');
  }
};

module.exports = sendEmail;
