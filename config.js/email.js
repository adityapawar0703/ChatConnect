require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});
const sendEmail = async (userName) => {
   console.log("line 24 in email.js called");
  try {
    const info = await transporter.sendMail({
      from: `<${process.env.EMAIL_USER}>`, // sender address
      to: "johnelbert0987@gmail.com",      // receiver (you)
      subject: "User Alert: Someone joined ChatConnect!", // Subject line
      text: "A user just joined ChatConnect. Please join the conversation now!",
      html: `
        <h2>User Alert</h2>
        <p>A ${userName || "Anonymous user"} just joined <strong>ChatConnect</strong>.</p>
        <p><a href="https://your-chatconnect-link.com" target="_blank">Click here to join now!</a></p>
      `,
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;