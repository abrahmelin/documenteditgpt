const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const upload = multer();

app.post('/api/enhance', upload.single('image'), async (req, res) => {
  const apiKey = process.env.PHOTO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'PHOTO_API_KEY not configured' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Here you would normally send req.file.buffer to your AI photo API using apiKey.
  // This implementation simply returns the uploaded image.
  res.set('Content-Type', req.file.mimetype);
  res.send(req.file.buffer);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
