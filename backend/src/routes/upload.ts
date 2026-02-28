import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, AuthRequest } from '../middleware/session';
import { updateProfile, getUserPublic } from '../db/database';

const router = Router();
router.use(requireAuth);

const isProd = process.env.NODE_ENV === 'production';
const UPLOAD_DIR = isProd
  ? path.join('/data', 'avatars')
  : path.resolve(__dirname, '../../../data/avatars');

// Ensure directory exists at startup
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, _file, cb) => {
    const userId = (req as AuthRequest).userId!;
    cb(null, `${userId}.jpg`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('invalid_file_type'));
    }
  },
});

router.post('/avatar', upload.single('avatar'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'no_file' });
    return;
  }
  const userId = req.userId!;
  const avatarUrl = `/uploads/avatars/${userId}.jpg`;
  updateProfile(userId, { avatar_url: avatarUrl });
  res.json({ avatar_url: avatarUrl, user: getUserPublic(userId) });
});

// 4-arg error handler — required by Express to handle multer errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'file_too_large' });
  } else if (err?.message === 'invalid_file_type') {
    res.status(400).json({ error: 'invalid_file_type' });
  } else {
    res.status(500).json({ error: 'upload_failed' });
  }
});

export default router;
