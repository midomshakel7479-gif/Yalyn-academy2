module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, count = 5, difficulty = 'medium', type = 'mcq' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'النص المرسل قصير جداً لتوليد الأسئلة.' });
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير موجود في إعدادات البيئة على Render.' 
      });
    }

    // بناء موجه الذكاء الاصطناعي
    const prompt = `أنت معلم وخبير تعليمي متميز. مهمتك هي قراءة النص التالي بدقة واستخراج (${count}) أسئلة تعليمية عالية الجودة بمستوى صعوبة (${difficulty}).

النص المرجعي:
"""
${text.slice(0, 15000)}
"""

المطلوب:
أرجع النتيجة بصيغة JSON صريحة فقط (JSON Array of Objects) بدون أي نصوص تمهيدية أو علامات markdown مثل \\`\\`\\`json.
يجب أن يكون كل سؤال كائن بالخصائص التالية:
[
  {
    "id": 1,
    "question": "نص السؤال هنا",
    "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
    "correctAnswer": "نفس نص الخيار الصحيح تماماً",
    "explanation": "شرح مبسط ومقنع لسبب صحة هذا الخيار مستنداً إلى النص"
  }
]`;

    // الاتصال بـ Google Gemini API
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
      throw new Error(result.error?.message || 'خطأ في استجابة نموذج الذكاء الاصطناعي');
    }

    const rawOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawOutput) {
      throw new Error('لم يرجع النموذج أي محتوى.');
    }

    // تنظيف واستخراج الـ JSON
    let parsedQuestions;
    try {
      const cleanJson = rawOutput.replace(/^```json/i, '').replace(/```$/i, '').trim();
      parsedQuestions = JSON.parse(cleanJson);
    } catch (e) {
      parsedQuestions = rawOutput;
    }

    return res.status(200).json({
      success: true,
      questions: parsedQuestions
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({ 
      error: 'فشل في توليد الأسئلة', 
      details: error.message 
    });
  }
};
