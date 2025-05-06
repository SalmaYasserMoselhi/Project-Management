const nodemailer = require('nodemailer');
const path = require('path');

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

    
  
    // Define logo paths
    const logoPath = path.join(__dirname, '../assets/nexus-logo.png');
    // const iconPath = path.join(__dirname, '../assets/nexus-icon.png');

  // Email options with HTML template
  const mailOptions = {
    from: {
      name: 'Nexus',
      address: process.env.GMAIL_USERNAME,
    },
    to: options.email,
    subject: options.subject,
    html: options.message,
    attachments: [
      {
        filename: 'nexus-logo.png',
        path: logoPath,
        cid: 'nexus_logo', // Content ID referenced in the HTML
        contentDisposition: 'inline' // Mark as inline to discourage showing as attachment
      },
      // {
      //   filename: 'nexus-icon.png',
      //   path: iconPath,
      //   cid: 'nexus_icon', // Content ID for the footer icon
      //   contentDisposition: 'inline' // Mark as inline to discourage showing as attachment
      // }
    ],
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
