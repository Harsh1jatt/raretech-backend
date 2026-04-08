const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "raretech/profile_images",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "raretech/documents",
    allowed_formats: ["jpg", "png", "jpeg", "pdf"],
  },
});

const officialStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "raretech/official",
    allowed_formats: ["png", "jpg", "svg"],
  },
});

const CourseStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "raretech/courses",
    allowed_formats: ["jpg", "png", "jpeg", "pdf"],
  },
});

module.exports = {
  uploadProfile: multer({ storage: profileStorage }),
  uploadDocument: multer({ storage: documentStorage }),
  uploadOfficial: multer({ storage: officialStorage }),
  uploadCourse: multer({ storage: CourseStorage }),
};