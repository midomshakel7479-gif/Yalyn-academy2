module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userAnswers, questions } = req.body;

    if (!userAnswers || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'البيانات غير مكتملة للتصحيح.' });
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

    const percentage = Math.round((score / questions.length) * 100);

    return res.status(200).json({
      success: true,
      totalQuestions: questions.length,
      correctCount: score,
      percentage: percentage,
      feedback: feedback
    });

  } catch (error) {
    console.error('Error grading answers:', error);
    return res.status(500).json({ 
      error: 'فشل في تصحيح الإجابات', 
      details: error.message 
    });
  }
};
