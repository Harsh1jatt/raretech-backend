const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courseSchema = new Schema({
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    exam: {
        examID: {
            type: String
        },
        price: {
            type: Number
        },
        reExamPrice: {
            type: Number
        },
        discountedPrice: {
            type: Number
        },

    },
    notes: {
        notesLink: {
            type: String
        },
        price: {
            type: Number
        },
        discountedPrice: {
            type: Number
        },
    },
    videos: [
        {
          videoTitle: { type: String, required: true },
          videoDescription: { type: String, required: true },
          videoURL: { type: String, required: true }
        }
    ],
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        required: true
    },
    enrollments: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student' 
    }], // Stores enrolled students,
    paymentHistory: [
        {
          student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
          razorpayPaymentId: String,
          razorpayOrderId: String,
          amountPaid: Number,
          paymentDate: { type: Date, default: Date.now }
        }
      ]
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
