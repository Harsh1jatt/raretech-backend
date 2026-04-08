const express = require("express");
const router = express.Router();
const instituteModel = require("../models/instituteModel");
const Student = require("../models/studentModel");
const Exam = require("../models/examModel");
const TypingTest = require("../models/typingTestModel");
const Question = require("../models/questionModel");
const CourseModel = require("../models/courseModel");
const Coupon = require("../models/couponModel");
const authMiddleware = require("../middlewares/auth");
const bcrypt = require("bcrypt");
const Razorpay = require('razorpay');
const Course = require("../models/courseModel");
const {
  uploadProfile,
  uploadDocument,
  uploadOfficial,
  uploadCourse
} = require("../utils/cloudinaryStorage");

router.post("/:instituteId/student", uploadProfile.single("image"), async (req, res) => {
  const { instituteId } = req.params;
  const { name, password, rollNumber, dateOfBirth } = req.body;
  // Input validation
if (!name || !password || !rollNumber || !dateOfBirth) {
  console.log("❌ Missing fields:", { name, password, rollNumber, dateOfBirth });

  return res.status(400).json({
    error: "All fields are required",
  });
}

  try {
    // Find the institute by its ID
    const institute = await instituteModel.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ error: "Institute not found" });
    }

    // Check if a student with the same roll number already exists
    const existingStudent = await Student.findOne({ rollNumber, institute: instituteId });
if (existingStudent) {
  return res.status(409).json({
    error: `Roll number ${rollNumber} already exists. Please use a different one.`,
  });
}

    // Hash the password before saving the student
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new student
    const newStudent = new Student({
      studentName: name,
      password: hashedPassword,
      secCode: password,
      rollNumber,
      dateOfBirth,
      profileImage: req.file?.path || "", // Save the Firebase image URL here
      institute: instituteId,
    });

    // Save the student and update the institute's students array
    await newStudent.save();
    institute.students.push(newStudent._id);
    await institute.save();

    // Respond with the created student and institute (excluding the password)
    res.status(201).json({
      message: "Student created successfully",
      student: {
        id: newStudent._id,
        name: newStudent.studentName,
        rollNumber: newStudent.rollNumber,
        dateOfBirth: newStudent.dateOfBirth,
        profileImage: newStudent.profileImage, // Return the image URL
        institute: newStudent.institute,
      },
      institute: {
        id: institute._id,
        name: institute.name,
        email: institute.email,
      },
    });
  } catch (error) {
    console.error("CREATE ERROR FULL:", error); // 🔥 ADD THIS
    res.status(500).json({ error: error.message });
  }
});

router.get("/my-institute", authMiddleware, async (req, res) => {
  try {
    if (req.userType === 'institute' && req.institute) {
      res.status(200).json(req.institute); // Send the institute data
    } else {
      res.status(403).json({ error: "Access denied. Not an institute user." });
    }
  } catch (error) {
    console.error("Error fetching institute details:", error);
    res.status(400).json({ error: "Error fetching institute details." });
  }
});


// Route to create and add a student to an institute


// Route to create an exam
router.post("/:instituteId/exam", async (req, res) => {
  const { instituteId } = req.params;
  try {
    // Find the institute by ID
    let institute = await instituteModel.findOne({ _id: instituteId });
    if (!institute) {
      return res.status(404).json({ error: "Institute not found" });
    }

    const { examName, examDescription, duration } =
      req.body;

    // Create a new exam
    const newExam = new Exam({
      examName,
      examDescription,
      institute: instituteId,
      createdBy: instituteId,
      duration,
    });
    await newExam.save();

    // Add the new exam to the institute's exams array
    institute.exams.push(newExam._id);

    // Save the updated institute document
    await institute.save();

    res.status(201).json(newExam);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to add a question to an exam
router.post("/:examId/questions", async (req, res) => {
  const { examId } = req.params;
  const { questionText, options, correctAnswer, subfield } = req.body;

  try {
    // Create a new question
    const newQuestion = new Question({
      questionText,
      options,
      correctAnswer,
      subfield,
      exam: examId,
    });

    // Save the new question
    await newQuestion.save();

    // Add the question to the exam's questions array
    const exam = await Exam.findById(examId);
    exam.questions.push(newQuestion._id);
    await exam.save();

    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all students of an institute
router.get("/:instituteId/students", async (req, res) => {
  const { instituteId } = req.params;
  try {
    const students = await Student.find({ institute: instituteId });
    res.status(200).json(students);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all exams of an institute
router.get("/:instituteId/exams", async (req, res) => {
  const { instituteId } = req.params;
  try {
    const exams = await Exam.find({ institute: instituteId }).populate(
      "questions"
    );
    res.status(200).json(exams);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Get all questions of an exam

router.get("/:examId/questions", async (req, res) => {
  const { examId } = req.params;

  try {
    // Find the exam and populate its questions
    const exam = await Exam.findById(examId).populate("questions");

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    res.status(200).json(exam.questions); // Return the populated questions
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// update feature

// Edit exam (excluding password updates)
router.post("/:examId/edit-exam", async (req, res) => {
  const { examId } = req.params;
  const { examName, examDescription, duration } = req.body;

  try {
    // Prepare an object with only the fields that are present in req.body
    const updateFields = {};
    if (examName !== undefined) updateFields.examName = examName;
    if (examDescription !== undefined) updateFields.examDescription = examDescription;
    if (duration !== undefined) updateFields.duration = duration;

    // Find and update the exam details with only the specified fields
    const exam = await Exam.findOneAndUpdate(
      { _id: examId },
      updateFields,
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    res.status(200).json({ message: "Exam updated successfully", exam });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/:questionId/edit-question", async (req, res) => {
  const { questionId } = req.params;
  const { questionText, options, correctAnswer, subfield } = req.body;

  try {
    // Prepare an object with only the fields that are present in req.body
    const updateFields = {};
    if (questionText !== undefined) updateFields.questionText = questionText;
    if (options !== undefined) updateFields.options = options;
    if (correctAnswer !== undefined) updateFields.correctAnswer = correctAnswer;
    if (subfield !== undefined) updateFields.subfield = subfield;

    // Find and update the question details with only the specified fields
    const question = await Question.findOneAndUpdate(
      { _id: questionId },
      updateFields,
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res
      .status(200)
      .json({ message: "Question updated successfully", question });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:studentId/edit-student", async (req, res) => {
  const { studentId } = req.params;
  const { name, rollNumber, dateOfBirth } = req.body;

  try {
    // Prepare an object with only the fields that are present in req.body
    const updateFields = {};
    if (name !== undefined) updateFields.studentName = name;
    if (rollNumber !== undefined) updateFields.rollNumber = rollNumber;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;

    // Find and update the student details with only the specified fields
    const student = await Student.findOneAndUpdate(
      { _id: studentId },
      updateFields,
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res
      .status(200)
      .json({ message: "Student details updated successfully", student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete Feature




// Delete student and remove reference from institute
router.post("/:studentId/delete-student", async (req, res) => {
  const { studentId } = req.params;

  try {
    // ✅ 1. Pehle student fetch karo (delete mat karo abhi)
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // ✅ 2. Cloudinary se files delete karo

    // Profile Image
    if (student.profileImage?.publicId) {
      await cloudinary.uploader.destroy(student.profileImage.publicId, {
        resource_type: "auto",
      });
    }

    // Certificate
    if (student.certificate?.publicId) {
      await cloudinary.uploader.destroy(student.certificate.publicId, {
        resource_type: "auto",
      });
    }

    // Marksheet
    if (student.marksheet?.publicId) {
      await cloudinary.uploader.destroy(student.marksheet.publicId, {
        resource_type: "auto",
      });
    }

    // ✅ 3. Ab student delete karo
    await Student.findByIdAndDelete(studentId);

    // ✅ 4. Institute update
    await instituteModel.updateOne(
      { _id: student.institute },
      { $pull: { students: studentId } }
    );

    res.status(200).json({
      message: "Student and all files deleted successfully",
    });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});
// Delete exam and remove reference from institute
router.post("/:examId/delete-exam", async (req, res) => {
  const { examId } = req.params;

  try {
    // Find and remove the exam
    let exam = await Exam.findOneAndDelete(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Remove exam from the related institute's exams array
    await instituteModel.updateOne(
      { _id: exam.institute },
      { $pull: { exams: examId } }
    );

    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete question and remove reference from exam
router.post("/:questionId/delete-question", async (req, res) => {
  const { questionId } = req.params;

  try {
    // Find and remove the question by ID
    const question = await Question.findOneAndDelete({ _id: questionId });
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Remove question from the related exam's questions array
    await Exam.updateOne(
      { _id: question.exam },
      { $pull: { questions: questionId } }
    );

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:examId/delete-all-questions", async (req, res) => {
  const { examId } = req.params;

  try {
    // Find the exam document by ID
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Check if there are any questions associated with this exam
    if (exam.questions.length === 0) {
      return res.status(400).json({ message: "No questions to delete for this exam" });
    }

    // Delete all questions from the Question collection that belong to this exam
    await Question.deleteMany({ _id: { $in: exam.questions } });

    // Clear the questions array in the Exam document
    exam.questions = [];
    await exam.save();

    res.status(200).json({ message: "All questions deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




router.post('/:examid/typing-test/create', async (req, res) => {
  const { title, passage, duration } = req.body;

  try {
    // Create the new Typing Test
    const newTest = new TypingTest({
      exam: req.params.examid,
      title,
      passage,
      duration,
      totalWords: passage.split(' ').length,
    });
    await newTest.save();

    // Update the Exam to include the Typing Test ID
    await Exam.findByIdAndUpdate(
      req.params.examid,
      { typingTest: newTest._id }, // Corrected: Wrapped in curly braces
      { new: true } // Return the updated document
    );

    // Respond with success
    res.status(201).json({
      message: 'Typing test created successfully',
      test: newTest,
    });
  } catch (error) {
    console.error('Error creating typing test:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:examid/typing-test', async (req, res) => {
  try {
    // Fetch the typing test associated with the given exam ID
    const typingTest = await TypingTest.findOne({ exam: req.params.examid });

    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    // Return the typing test details
    res.status(200).json({
      message: 'Typing test fetched successfully',
      typingTest,
    });
  } catch (error) {
    console.error('Error fetching typing tests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a typing test by ID
router.post('/:testid/edit-typingtest', async (req, res) => {
  try {
    // Extract test ID from params and updated data from the request body
    const { testid } = req.params;
    const updatedData = req.body;

    // Find the typing test by ID and update it
    const typingTest = await TypingTest.findByIdAndUpdate(
      testid,
      updatedData,
      { new: true } // Return the updated document
    );

    // If the typing test doesn't exist, return a 404 response
    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    // Return the updated typing test
    res.status(200).json({
      message: 'Typing test updated successfully',
      typingTest,
    });
  } catch (error) {
    console.error('Error updating typing test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route for handling exam submission// Route for handling exam submission


router.post('/submitExam/:examId', async (req, res) => {
  const {
    studentName,
    RollNumber,
    profileImage,
    userAnswers,
    wpm,
    marks,
    pass,
  } = req.body;
  const { examId } = req.params;

  try {
    // Find the exam and populate the questions
    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({ msg: 'Exam not found' });
    }

    // Construct detailed results for each question
    const detailedResults = Object.entries(userAnswers).map(
      ([questionId, userAnswer]) => {
        const question = exam.questions.find((q) => q._id.toString() === questionId);
        if (!question) return null; // Skip invalid question IDs

        const isCorrect = userAnswer === question.correctAnswer;

        return {
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          userAnswer,
          options: question.options,
          isCorrect,
        };
      }
    ).filter(Boolean); // Remove null entries

    // Create a new result object
    const newResult = {
      studentName,
      RollNumber,
      profileImage,
      wpm,
      marks,
      pass,
      userAnswers: detailedResults,
      dateTaken: new Date(),
    };

    // Add the new result to the exam's results array
    exam.results.push(newResult);

    // Save the updated exam document
    await exam.save();

    // Respond with the updated exam results
    res.status(200).json({ msg: 'Exam submitted successfully', examResults: exam.results });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// Route to get results with full student details (excluding password and secCode)
router.get('/:examId/results', async (req, res) => {
  try {
    const { examId } = req.params;

    const examResults = await Exam.findById(examId);
    if (!examResults) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    res.status(200).json({
      examName: examResults.examName,
      results: examResults.results
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/results/:resultId/', async (req, res) => {
  try {
    const { resultId } = req.params;

    // Find the exam containing the specific result ID in the results array
    const exam = await Exam.findOne({ 'results._id': resultId });

    if (!exam) {
      return res.status(404).json({ error: 'Result not found in any exam' });
    }

    // Extract the specific result using Mongoose's `id` method
    const result = exam.results.id(resultId);

    if (!result) {
      return res.status(404).json({ error: 'Result not found in the exam' });
    }

    // Send the result details
    res.status(200).json({
      examName: exam.examName,
      resultDetails: result,
    });
  } catch (error) {
    console.error('Error fetching exam result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete multiple students and update the institute's students array
router.post("/:instituteId/delete-students", async (req, res) => {
  const { instituteId } = req.params;
  const { ids } = req.body; // Expecting an array of student IDs

  // Validate that ids is provided and is an array
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: '"ids" must be an array of student IDs' });
  }

  try {
    // Delete students that belong to the institute and have an _id in the ids array
    const result = await Student.deleteMany({ _id: { $in: ids }, institute: instituteId });

    // Update the institute document to remove references to these students
    await instituteModel.updateOne(
      { _id: instituteId },
      { $pull: { students: { $in: ids } } }
    );

    // Log the deleted student IDs for debugging
    console.log("Deleted student IDs:", ids);

    res.status(200).json({
      message: "Selected students deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting multiple students:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to delete multiple exams and update the institute's exams array
router.post("/:instituteId/delete-exams", async (req, res) => {
  const { instituteId } = req.params;
  const { ids } = req.body; // Expecting an array of exam IDs

  // Validate that ids is provided and is an array
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: '"ids" must be an array of exam IDs' });
  }

  try {
    // Delete exams that belong to the institute and whose _id is in the ids array
    const result = await Exam.deleteMany({ _id: { $in: ids }, institute: instituteId });

    // Remove exam references from the institute's exams array
    await instituteModel.updateOne(
      { _id: instituteId },
      { $pull: { exams: { $in: ids } } }
    );

    // Log the deleted exam IDs for debugging purposes
    console.log("Deleted exam IDs:", ids);

    res.status(200).json({
      message: "Selected exams deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting multiple exams:", error);
    res.status(500).json({ error: error.message });
  }
});

// Use upload.fields to accept multiple file fields
router.post("/:studentId/upload-certificate", uploadDocument.fields([
  { name: "certificate", maxCount: 1 },
  { name: "marksheet", maxCount: 1 },
]),
  async (req, res) => {
    const { studentId } = req.params;

    try {
      // Find the student by ID
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      console.log(req.files);
      // Extract uploaded files

      const cert = req.files?.certificate?.[0];
      const mark = req.files?.marksheet?.[0];


      if (!cert && !mark) {
        return res.status(400).json({
          success: false,
          message: "Please upload at least certificate or marksheet",
        });
      }

      // Upload files if they exist
      if (cert) {
        student.certificate = {
          fileUrl: cert.path,
          publicId: cert.filename,
          issuedDate: new Date(), // Optional: set issue date
          verificationCode: Math.random().toString(36).substring(2, 10) // Optional: generate code
        };
      }

      if (mark) {
        student.marksheet = {
          fileUrl: mark.path,
          publicId: mark.filename,
          issuedDate: new Date(), // Optional
          verificationCode: Math.random().toString(36).substring(2, 10) // Optional
        };
      }

      await student.save();

      res.status(200).json({
        message: "File(s) uploaded successfully.",
        certificate: student.certificate || "Not Uploaded",
        marksheet: student.marksheet || "Not Uploaded",
      });
    } catch (err) {
      console.log("FULL ERROR:", err);
      console.log("RESPONSE:", err.response);
      console.log("DATA:", err.response?.data);

      setError(err.response?.data?.message || "Upload failed");
    }
  }
);

// Route to get a student's certificate by roll number
router.get("/certificate/:rollNumber", async (req, res) => {
  const { rollNumber } = req.params;

  try {
    // Find the student by roll number
    const student = await Student.findOne({ rollNumber });
    if (!student) {
      return res
        .status(404)
        .json({ error: "Student not found with the given roll number" });
    }

    // Check if the certificate exists for the student
    if (!student.certificate) {
      return res
        .status(404)
        .json({ error: "Certificate not found for this student" });
    }

    // Respond with the certificate URL or file path
    res.status(200).json({ certificate: student.certificate, marksheet: student.marksheet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/:instituteId/courses", async (req, res) => {
  const { instituteId } = req.params;
  try {
    const courses = await CourseModel.find({ institute: instituteId });
    res.status(200).json(courses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get("/course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseDetail = await CourseModel.findById(courseId);

    if (!courseDetail) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(courseDetail);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/:instituteId/course", uploadCourse.single('image'), async (req, res) => {
  const { instituteId } = req.params;
  try {
    // ✅ Check if the Institute exists
    const instituteExists = await instituteModel.findById(instituteId);
    if (!instituteExists) {
      return res.status(404).json({ error: "Institute not found" });
    }

    // ✅ Extract and validate request body
    const { title, description, price, discount } = req.body;
    if (!title || !description || price === undefined || discount === undefined) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const courseImage = req.file ? req.file.path : "";
    // ✅ Create new course
    const newCourse = new CourseModel({
      image: courseImage,
      title,
      description,
      price: Number(price), // Ensure it's a number
      discount: Number(discount), // Ensure it's a number
      institute: instituteId, // Associate course with institute
    });

    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:instituteId/course/:courseId/delete", async (req, res) => {
  const { instituteId, courseId } = req.params;
  try {
    // ✅ Check if the Institute exists
    const instituteExists = await instituteModel.findById(instituteId);
    if (!instituteExists) {
      return res.status(404).json({ error: "Institute not found" });
    }

    // ✅ Check if the Course exists and belongs to the given institute
    const course = await CourseModel.findOne({ _id: courseId, institute: instituteId });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Delete the course
    await CourseModel.findByIdAndDelete(courseId);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/:courseId/add-notes", async (req, res) => {
  const { courseId } = req.params;
  const { notesLink, price } = req.body; // ✅ Expect "notesLink" to match schema

  try {
    // ✅ Check if the course exists
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Validate required fields
    if (!notesLink || price === undefined) {
      return res.status(400).json({ error: "Both notesLink and price are required" });
    }

    // ✅ Update course with notes details
    course.notes = {
      notesLink,
      price,
    };
    await course.save();

    res.status(200).json({ message: "Notes added successfully", course });
  } catch (error) {
    console.error("Error adding notes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:courseId/add-exam", async (req, res) => {
  const { courseId } = req.params;
  const { examID, price, reExamPrice } = req.body;

  try {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (!examID || price === undefined || reExamPrice === undefined) {
      return res.status(400).json({ error: "examID, price, and secExamPrice are required" });
    }

    course.exam = {
      examID,
      price: Number(price),
      reExamPrice: Number(reExamPrice),
    };

    await course.save();
    res.status(201).json({ message: "Exam added successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.post("/:courseId/add-video", async (req, res) => {
  const { courseId } = req.params;
  const { videoTitle, videoDescription, videoURL } = req.body;

  try {
    // ✅ Check if the course exists
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Validate required fields
    if (!videoTitle || !videoDescription || !videoURL) {
      return res.status(400).json({ error: "All fields (videoTitle, videoDescription, videoURL) are required." });
    }

    // ✅ Add video to the course (assuming `videos` is an array)
    if (!course.videos) {
      course.videos = [];
    }
    course.videos.push({
      videoTitle,
      videoDescription,
      videoURL,
    });

    await course.save();
    res.status(201).json({ message: "Video added successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/:courseId/videos", async (req, res) => {
  const { courseId } = req.params;

  try {
    // ✅ Check if the course exists
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Return the videos array (if exists)
    res.status(200).json({ videos: course.videos || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:courseId/update-course", uploadCourse.single('image'), async (req, res) => {
  const { courseId } = req.params;
  const { title, description, price, discount } = req.body;

  try {
    // ✅ Check if the course exists
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    const courseImage = req.file ? req.file.path : "";
    // ✅ Update only provided fields
    if (courseImage !== "") course.image = courseImage;
    if (title) course.title = title;
    if (description) course.description = description;
    if (price !== undefined) course.price = Number(price);
    if (discount !== undefined) course.discount = Number(discount);

    // ✅ Save the updated course
    await course.save();

    res.status(200).json({ message: "Course updated successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:courseId/update-video", async (req, res) => {
  const { courseId } = req.params;
  const { oldVideoUrl, newVideoTitle, newVideoDescription, newVideoUrl } = req.body;

  try {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Find video by URL
    const video = course.videos.find(v => v.videoUrl === oldVideoUrl);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // ✅ Update fields if provided
    if (newVideoTitle) video.videoTitle = newVideoTitle;
    if (newVideoDescription) video.videoDescription = newVideoDescription;
    if (newVideoUrl) video.videoUrl = newVideoUrl;

    await course.save();
    res.status(200).json({ message: "Video updated successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.delete("/:courseId/delete-video", async (req, res) => {
  const { courseId } = req.params;
  const { videoUrl } = req.body;

  try {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const initialLength = course.videos.length;
    course.videos = course.videos.filter(video => video.videoUrl !== videoUrl);

    if (initialLength === course.videos.length) {
      return res.status(404).json({ error: "Video not found" });
    }

    await course.save();
    res.status(200).json({ message: "Video deleted successfully", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/course/enroll", async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    // Validate input
    if (!studentId || !courseId) {
      return res.status(400).json({ message: "Student ID and Course ID are required" });
    }

    // Fetch student and course
    const [student, course] = await Promise.all([
      Student.findById(studentId),
      CourseModel.findById(courseId)
    ]);

    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Check if student is already enrolled
    if (student.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ message: "Student already enrolled in this course" });
    }

    // Enroll student
    student.enrolledCourses.push(courseId);
    course.enrollments.push(studentId);

    await Promise.all([student.save(), course.save()]);

    res.status(200).json({ message: "Enrollment successful", course, student });

  } catch (error) {
    console.error("Enrollment Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Create Razorpay order route
router.post("/create-order", async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID_HARSH,
      key_secret: process.env.RAZORPAY_SECRET_HARSH,
    });

    const { amount, currency = "INR", receipt } = req.body;

    // ✅ Validate minimum amount
    if (!amount || amount < 1) {
      return res.status(400).json({ message: "Amount must be at least ₹1" });
    }

    const options = {
      amount: amount * 100, // in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ order, key: process.env.RAZORPAY_KEY_ID_HARSH });
  } catch (err) {
    console.error("Razorpay Order Error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});


// Route: Create Coupon Code (Admin Only)
router.post('/create-coupon', async (req, res) => {
  try {
    const { code, discountPercentage, expiryDate } = req.body;

    if (!code || !discountPercentage || !expiryDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const newCoupon = new Coupon({
      code,
      discountPercentage,
      expiryDate,
      isActive: true
    });

    await newCoupon.save();

    res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/delete-coupon/:couponId', async (req, res) => {
  try {
    const { couponId } = req.params;

    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

    if (!deletedCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon deleted successfully', coupon: deletedCoupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find(); // Fetch all coupons from the database
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Route: Verify Payment

router.post("/verify-payment", async (req, res) => {
  try {
    const {
      paymentID,
      amount,
      courseId,
      type,
      rollNumber,
      couponCode,
      reExam,
    } = req.body;

    if (!paymentID || !amount || !courseId || !type || !rollNumber) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const student = await Student.findOne({ rollNumber });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Default Razorpay credentials
    let razorpayKeyID = process.env.RAZORPAY_KEY_ID;
    let razorpaySecret = process.env.RAZORPAY_SECRET;

    if (type === "exam") {
      const alreadyAttempted = student.attempted.some(
        (a) => a.courseID.toString() === courseId
      );

      if (alreadyAttempted) {
        // Use HARSH credentials for re-exam
        razorpayKeyID = process.env.RAZORPAY_KEY_ID_HARSH;
        razorpaySecret = process.env.RAZORPAY_SECRET_HARSH;
      }
    }

    if (type === "notes") {
      const alreadyPurchased = student.notesPurchased.some(
        (n) => n.courseId.toString() === courseId
      );

      if (alreadyPurchased) {
        return res
          .status(400)
          .json({ message: "Notes already purchased for this course" });
      }

      // If student has attempted any exam before, use HARSH keys
      if (student.attempted && student.attempted.length > 0) {
        razorpayKeyID = process.env.RAZORPAY_KEY_ID_HARSH;
        razorpaySecret = process.env.RAZORPAY_SECRET_HARSH;
      }
    }

    const razorpayInstance = new Razorpay({
      key_id: razorpayKeyID,
      key_secret: razorpaySecret,
    });

    // Fetch payment details
    let paymentDetails = await razorpayInstance.payments.fetch(paymentID);

    if (!paymentDetails || parseInt(paymentDetails.amount) !== amount * 100) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    // Capture the payment if still authorized
    if (paymentDetails.status === "authorized") {
      await razorpayInstance.payments.capture(paymentID, amount * 100, "INR");
      paymentDetails = await razorpayInstance.payments.fetch(paymentID);
    }

    if (paymentDetails.status !== "captured") {
      return res
        .status(400)
        .json({ message: "Payment verification failed" });
    }

    // Save payment info
    if (type === "exam") {
      const course = await Course.findById(courseId);
      const examAttemptData = {
        courseID: course._id,
        examID: course.exam.examID,
        status: "Paid",
        paidAmount: amount,
        paymentID,
        couponCode: couponCode || null,
      };

      const existingIndex = student.attempted.findIndex(
        (a) => a.courseID.toString() === courseId
      );

      if (existingIndex !== -1) {
        student.attempted[existingIndex] = examAttemptData;
      } else {
        student.attempted.push(examAttemptData);
      }
    } else if (type === "notes") {
      const course = await CourseModel.findById(courseId);
      student.notesPurchased.push({
        courseId,
        notesLink: course.notes.notesLink,
        paidAmount: amount,
        paymentID,
        couponCode: couponCode || null,
      });
    }

    await student.save();

    return res.status(200).json({
      success: true,
      student,
      message: "Payment verified and recorded",
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


router.post("/zero-payment", async (req, res) => {
  try {
    const { courseId, type, rollNumber, couponCode } = req.body;

    if (!courseId || !type || !rollNumber) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const student = await Student.findOne({ rollNumber });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (type === "exam") {
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });

      const examAttemptData = {
        courseID: course._id,
        examID: course.exam.examID,
        status: "Paid",
        paidAmount: 0,
        paymentID: "FREE-COUPON",
        couponCode: couponCode || null,
      };

      const existingIndex = student.attempted.findIndex(
        (a) => a.courseID.toString() === courseId
      );

      if (existingIndex !== -1) {
        student.attempted[existingIndex] = examAttemptData;
      } else {
        student.attempted.push(examAttemptData);
      }
    } else if (type === "notes") {
      const course = await CourseModel.findById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });

      student.notesPurchased.push({
        courseId,
        notesLink: course.notes.notesLink,
        paidAmount: 0,
        paymentID: "FREE-COUPON",
        couponCode: couponCode || null,
      });
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    await student.save();

    return res.status(200).json({
      success: true,
      student,
      message: "Access granted via zero payment",
    });
  } catch (error) {
    console.error("Zero Payment Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/verify-coupon", async (req, res) => {
  try {
    const { code, courseId, type } = req.body;
    console.log(code, courseId);

    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or inactive coupon code." });
    }

    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return res.status(400).json({ success: false, message: "Coupon has expired." });
    }

    let discountedPrice = null;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    if (type === "exam") {
      let examPrice = course.exam?.price || 0;
      discountedPrice = Math.floor(examPrice - (examPrice * coupon.discountPercentage) / 100);
      course.exam.discountedPrice = discountedPrice;
    } else if (type === "notes") {
      let notesPrice = course.notes?.price || 0;
      discountedPrice = Math.floor(notesPrice - (notesPrice * coupon.discountPercentage) / 100);
      course.notes.discountedPrice = discountedPrice;
    } else {
      return res.status(400).json({ success: false, message: "Invalid type." });
    }

    res.status(200).json({
      success: true,
      message: "Coupon Applied!",
      discountedPrice
    });

  } catch (error) {
    console.error("Error verifying coupon:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});





router.get('/findexam/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    // Step 1: Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Step 2: Get the exam ID from the course
    const examId = course.exam?.examID;

    if (!examId) {
      return res.status(404).json({ message: 'No exam associated with this course' });
    }

    // Step 3: Find the exam using the exam ID
    const exam = await Exam.findById(examId)
      .populate('questions') // Optional: populate questions if needed
      .populate('typingTest') // Optional: populate typing test if included
      .populate('institute')  // Optional: show institute info
      .populate('createdBy'); // Optional: show creator info

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.status(200).json(exam);

  } catch (error) {
    console.error('Error fetching exam by course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/submit-exam/:courseId', async (req, res) => {
  try {
    const { studentId, userAnswers, wpm = null } = req.body;

    // Validate incoming data
    if (!studentId || !Array.isArray(userAnswers)) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const course = await Course.findById(req.params.courseId);

    const exam = await Exam.findById(course.exam.examID);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    // Calculate marks and correctness
    let correctCount = 0;

    const detailedAnswers = userAnswers.map(ans => {
      const isCorrect = ans.correctAnswer === ans.userAnswer;
      if (isCorrect) correctCount++;

      return {
        questionText: ans.questionText,
        correctAnswer: ans.correctAnswer,
        userAnswer: ans.userAnswer,
        options: ans.options || [],
        isCorrect
      };
    });

    const totalQuestions = userAnswers.length;
    const marks = correctCount;
    const passPercentage = 33; // Pass if ≥33%
    const percentage = (marks / totalQuestions) * 100;
    const passed = percentage >= passPercentage;

    // Save to exam results
    const resultEntry = {
      studentName: student.studentName,
      profileImage: student.profileImage || '',
      RollNumber: student.rollNumber || '',
      userAnswers: detailedAnswers,
      wpm,
      marks,
      pass: passed,
      dateTaken: new Date()
    };

    exam.results.push(resultEntry);
    await exam.save();

    // Update student attempted status
    const attemptedIndex = student.attempted.findIndex(
      (a) => a.examID.toString() === exam._id.toString()
    );

    if (attemptedIndex !== -1) {
      student.attempted[attemptedIndex].status = passed ? 'Pass' : 'Failed';
      student.attempted[attemptedIndex].Marks = marks;
      student.attempted[attemptedIndex].Result = passed ? 'Pass' : 'Failed';
    } else {
      student.attempted.push({
        examID: exam._id.toString(),
        status: passed ? 'Pass' : 'Failed',
        Result: passed ? 'Pass' : 'Failed',
        Marks: marks,
        courseID: null,
        paidAmount: 0,
        paymentID: ''
      });
    }

    // Optional: Update overall score/pass field
    student.score = marks;
    student.passed = passed;

    await student.save();

    res.status(200).json({
      message: 'Exam submitted successfully.',
      marks,
      totalQuestions,
      passed,
      result: resultEntry
    });

  } catch (err) {
    console.error('Exam submission error:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});





module.exports = router;
