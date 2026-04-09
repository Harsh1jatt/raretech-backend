const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema({
    studentName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        required: true
    },
    rollNumber: {
        type: String,
        required: true,
    },
    examsTaken: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam'
    }],
    dateOfBirth: {
        type: String
    },
    profileImage: {
        url: String,
        publicId: String,
    },
    secCode: {
        type: String,
        required: true
    },
    score: {
        type: Number,
    },
    passed: {
        type: Boolean,
    },
    certificate: {
        fileUrl: { type: String },
        issuedDate: { type: Date },
        publicId: { type: String },
        verificationCode: { type: String }
    },
    marksheet: {
        fileUrl: { type: String },
        issuedDate: { type: Date },
        publicId: { type: String },
        verificationCode: { type: String }
    },

    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'course'
    }], // Stores courses the student is enrolled in

    notesPurchased: [{
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        notesLink: {
            type: String,
        },
        paidAmount: {
            type: Number,
            required: true // Ensures payment tracking for notes
        },
        paymentID: {
            type: String // Razorpay Payment ID
        }
    }], // Stores notes the student has purchased

    attempted: [{
        courseID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        examID: {
            type: String,
        },
        status: {
            type: String,
            default: "Pending"
        },
        paidAmount: {
            type: Number,
            required: true // Now required to ensure payment tracking
        },
        paymentID: {
            type: String // Razorpay Payment ID
        },
        Result: {
            type: String
        },
        Marks: {
            type: Number
        }
    }]
}, { timestamps: true });

const Student = mongoose.model('student', studentSchema);
module.exports = Student;
