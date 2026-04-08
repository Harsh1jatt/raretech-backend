const mongoose = require("mongoose");
const cloudinary = require("../cloudinary");
const Student = require("../../models/studentModel");

mongoose.connect("mongodb://127.0.0.1:27017/raretech")
  .then(() => console.log("✅ MongoDB connected for migration"))
  .catch(err => console.log("❌ DB error:", err));

const migrateImages = async () => {
  const students = await Student.find();

  console.log(`🚀 Total students: ${students.length}`);

  for (let student of students) {
    try {
      let updated = false;
console.log("URL:", student.profileImage);
      // 🔁 PROFILE IMAGE
      if (student.profileImage && student.profileImage.includes("firebase")) {
        console.log(`⬆ Uploading profile: ${student.studentName}`);

        const res = await cloudinary.uploader.upload(student.profileImage, {
          folder: "raretech/profile_images",
        });

        student.profileImage = res.secure_url;
        updated = true;
      }

      // 🔁 CERTIFICATE
      if (student.certificate?.fileUrl && student.certificate.fileUrl.includes("firebase")) {
        console.log(`⬆ Uploading certificate: ${student.studentName}`);

        const res = await cloudinary.uploader.upload(student.certificate.fileUrl, {
          folder: "raretech/certificates",
          resource_type: "auto",
        });

        student.certificate.fileUrl = res.secure_url;
        updated = true;
      }

      // 🔁 MARKSHEET
      if (student.marksheet?.fileUrl && student.marksheet.fileUrl.includes("firebase")) {
        console.log(`⬆ Uploading marksheet: ${student.studentName}`);

        const res = await cloudinary.uploader.upload(student.marksheet.fileUrl, {
          folder: "raretech/marksheets",
          resource_type: "auto",
        });

        student.marksheet.fileUrl = res.secure_url;
        updated = true;
      }

      if (updated) {
        await student.save();
        console.log(`✅ Updated: ${student.studentName}`);
      } else {
        console.log(`⏭ Skipped: ${student.studentName}`);
      }

    }catch (err) {
  console.error(`❌ Error for ${student.studentName}:`, err);
}
  }

  console.log("🎉 Migration Completed");
  process.exit();
};

migrateImages();