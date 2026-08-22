const pdfParse = require('pdf-parse');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'لم يتم إرسال ملف PDF بصيغة Base64' });
    }

    // تنظيف نص Base64
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'لم نتمكن من قراءة أي نص داخل الملف. تأكد أن الملف يحتوي على نصوص وليس صوراً ممسوحة فقط.' 
      });
    }

    return res.status(200).json({
      success: true,
      text: data.text,
      numpages: data.numpages,
      info: data.info
    });

  } catch (error) {
    console.error('Error extracting PDF:', error);
    return res.status(500).json({ 
      error: 'فشل استخراج النصوص من ملف PDF', 
      details: error.message 
    });
  }
};
