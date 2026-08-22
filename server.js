const express = require('express');
const cors = require('cors');
const path = require('path');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// خدمة الصفحة الرئيسية
app.use(express.static(path.join(__dirname, 'public')));

// 1. مسار استخراج النصوص من الـ PDF
app.post('/api/extract-pdf', async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'لم يتم إرسال ملف PDF' });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      return res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على نصوص قابلة للقراءة.' });
    }

    return res.status(200).json({
      success: true,
      text: data.text,
      numpages: data.numpages
    });
  } catch (error) {
    console.error('PDF Error:', error);
    return res.status(500).json({ error: 'فشل قراءة ملف الـ PDF', details: error.message });
  }
});

// 2. مسار توليد الأسئلة عبر الذكاء الاصطناعي
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { text, count = 5, difficulty = 'medium' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'النص قصير جداً.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير مضاف في لوحة تحكم Railway.' });
    }

    const prompt = `أنت معلم خبير. استخرج (${count}) أسئلة اختيار من متعدد بمستوى صعوبة (${difficulty}) بناءً على هذا النص:
"""
${text.slice(0, 15000)}
"""

أرجع النتيجة بصيغة JSON Array of Objects فقط، بدون أي نصوص أخرى:
[
  {
    "id": 1,
    "question": "نص السؤال",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswer": "نفس نص الخيار الصحيح",
    "explanation": "توضيح مبسط"
  }
]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'خطأ في استجابة Gemini API');
    }

    const rawOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJson = rawOutput.replace(/^```json/i, '').replace(/```$/i, '').trim();
    const parsedQuestions = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      questions: parsedQuestions
    });
  } catch (error) {
    console.error('AI Error:', error);
    return res.status(500).json({ error: 'فشل في توليد الأسئلة', details: error.message });
  }
});

// 3. مسار تصحيح الإجابات
app.post('/api/grade-answers', (req, res) => {
  try {
    const { userAnswers, questions } = req.body;
    if (!userAnswers || !questions) {
      return res.status(400).json({ error: 'بيانات غير مكتملة.' });
    }

    let score = 0;
    const feedback = questions.map((q, idx) => {
      const selected = userAnswers[q.id || idx];
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;

      return {
        questionId: q.id || idx,
        question: q.question,
        selectedAnswer: selected || 'لم تتم الإجابة',
        correctAnswer: q.correctAnswer,
        isCorrect: isCorrect,
        explanation: q.explanation || ''
      };
    });

    return res.status(200).json({
      success: true,
      totalQuestions: questions.length,
      correctCount: score,
      percentage: Math.round((score / questions.length) * 100),
      feedback: feedback
    });
  } catch (error) {
    return res.status(500).json({ error: 'فشل التصحيح', details: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
