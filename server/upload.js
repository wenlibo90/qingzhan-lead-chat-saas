'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.zip', '.rar', '.7z', '.webm', '.mp4', '.mp3'
]);

function makeStorage(maxSizeMb) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const d = new Date();
      const dir = path.join(UPLOAD_DIR, `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10);
      cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED.has(ext)) return cb(new Error('不支持的文件类型'));
  cb(null, true);
}

const upload = multer({ storage: makeStorage(20), limits: { fileSize: 20 * 1024 * 1024, files: 1 }, fileFilter });
const uploadRecording = multer({ storage: makeStorage(200), limits: { fileSize: 200 * 1024 * 1024, files: 1 } });

function publicUrl(file) {
  const rel = path.relative(UPLOAD_DIR, file.path).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

module.exports = { upload, uploadRecording, publicUrl, UPLOAD_DIR };
