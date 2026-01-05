const express = require('express');
const router = express.Router();
const transporter = require('../utils/emailTransporter');

// POST /api/email/send-notification
router.post('/send-notification', async (req, res) => {
  try {
    const { email, courseTitle, courseId, startDate, coursePrice } = req.body;

    if (!email || !courseTitle) {
      return res.status(400).json({
        success: false,
        message: 'Email and course title are required',
      });
    }

    const emailTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 10px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
            .content { margin: 20px 0; line-height: 1.6; color: #333; }
            .course-details { background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Course Notification Confirmed! ✅</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for signing up for notifications!</p>
              <div class="course-details">
                <h3>${courseTitle}</h3>
                <p><strong>Start Date:</strong> ${new Date(
                  startDate
                ).toLocaleDateString()}</p>
                <p><strong>Price:</strong> $${coursePrice}</p>
              </div>
              <a href="https://language-center-bedfd.web.app/classes/${courseId}" class="button">View Course</a>
            </div>
            <div class="footer">
              <p>&copy; 2024 Language Learner</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `Notification Confirmed: ${courseTitle}`,
      html: emailTemplate,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Notification email sent successfully',
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification email',
      error: error.message,
    });
  }
});

module.exports = router;
