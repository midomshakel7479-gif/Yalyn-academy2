const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// إعداد سعة رفع الملفات والبيانات لتجنب أخطاء الحجم
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// خدمة الملفات الثابتة (واجهة الموقع)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// استيراد معالجات الـ API
const extractPdf = require('./api/extract-pdf');
const generateQuestions = require('./api/generate-questions');
const gradeAnswers = require('./api/grade-answers');

// مسارات الـ API
app.post('/api/extract-pdf', (req, res) => extractPdf(req, res));
app.post('/api/generate-questions', (req, res) => generateQuestions(req, res));
app.post('/api/grade-answers', (req, res) => gradeAnswers(req, res));

// مسار فحص صحة الخادم
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running smoothly on Render' });
});

// إعادة توجيه أي مسار آخر للصفحة الرئيسية
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🚀 الخادم يعمل بنجاح على المنفذ: ${PORT}`);
  console.log(`🌐 الرابط المحلي: http://localhost:${PORT}`);
  console.log(`===========================================`);
});
