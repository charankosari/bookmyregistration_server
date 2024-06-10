// const multer = require('multer');
// const GridFsStorage = require('gridfs-stream');
// const mongoose = require('mongoose');
// const path = require('path');
// const crypto = require('crypto');

// let gfs;
// let conn;

// const connectDatabase = () => {
//   conn = mongoose.createConnection(process.env.DB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
//   });

//   conn.once('open', () => {
//     gfs = mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
//   });

//   return conn;
// };

// const storage = new GridFsStorage({
//   db: conn ? conn.db : connectDatabase().db,
//   file: (req, file) => {
//     return new Promise((resolve, reject) => {
//       crypto.randomBytes(16, (err, buf) => {
//         if (err) {
//           return reject(err);
//         }
//         const filename = buf.toString('hex') + path.extname(file.originalname);
//         const fileInfo = {
//           filename: filename,
//           bucketName: 'uploads'
//         };
//         resolve(fileInfo);
//       });
//     });
//   }
// });

// const upload = multer({ storage });

// const FileUpload = asyncHandler(async (req, res, next) => {
//   upload.single('file')(req, res, (err) => {
//     if (err) {
//       return next(err);
//     }
//     if (!req.file) {
//       return next(new Error('No file uploaded'));
//     }
//     res.status(200).json({ success: true, message: 'File uploaded successfully', file: req.file });
//   });
// });

// module.exports = FileUpload;
