const express = require('express');
const router = express.Router();
// const { getCollections } = require('../config/database');
const verifyJwt = require('../middleware/verifyJwt');
const { getCollections } = require('../config/database');

// POST /api/enrollments
router.post('/', verifyJwt, async (req, res) => {
  try {
    const { enrollCourseCollection } = await getCollections();
    const enrollmentData = req.body;

    if (!enrollmentData.studentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Student email is required',
      });
    }

    const existingEnrollment = await enrollCourseCollection.findOne({
      studentEmail: enrollmentData.studentEmail,
      className: enrollmentData.className,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'You are already enrolled in this class',
      });
    }

    const enrollmentRecord = {
      studentEmail: enrollmentData.studentEmail,
      studentName: enrollmentData.studentName || 'Anonymous',
      className: enrollmentData.className,
      classImage: enrollmentData.classImage || '',
      instructorName: enrollmentData.instructorName || '',
      instructorEmail: enrollmentData.instructorEmail || '',
      courseId: enrollmentData.courseId || '',
      amount: enrollmentData.amount || 0,
      transactionId: enrollmentData.transactionId || '',
      date: enrollmentData.date || new Date(),
      enrolledAt: new Date(),
      status: 'active',
    };

    const result = await enrollCourseCollection.insertOne(enrollmentRecord);

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in class',
      insertedId: result.insertedId,
      acknowledged: result.acknowledged,
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in class',
      error: error.message,
    });
  }
});

// GET /api/enrollments/:email
router.get('/:email', verifyJwt, async (req, res) => {
  try {
    const { enrollCourseCollection } = await getCollections();
    const email = req.params.email;
    const decodedEmail = req.decoded.email;

    if (decodedEmail !== email) {
      return res.status(403).send({
        error: true,
        message: 'Forbidden Access',
      });
    }

    const query = { studentEmail: email };
    const result = await enrollCourseCollection
      .find(query)
      .sort({ enrolledAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled classes',
      error: error.message,
    });
  }
});

module.exports = router;
