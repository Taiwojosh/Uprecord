import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = Router();

/**
 * POST /api/ai/generate-remarks
 * 
 * Secure backend endpoint for generating AI remarks for students.
 * The GEMINI_API_KEY remains strictly on the server and is never exposed in the browser bundle.
 */
router.post('/generate-remarks', authenticate, enforceTenant, async (req: Request, res: Response) => {
  try {
    const { studentName, gender, average, subjects, traits } = req.body;

    if (!studentName) {
      res.status(400).json({ error: 'Student name is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If no API key configured, provide a high-quality deterministic fallback
    if (!apiKey) {
      const avg = Number(average) || 0;
      let teacherRemark = '';
      let principalRemark = '';

      if (avg >= 75) {
        teacherRemark = `${studentName} demonstrates outstanding intellectual diligence and mastery across subjects. Excellent performance!`;
        principalRemark = `A commendable term's work. Continue striving for highest academic honors.`;
      } else if (avg >= 60) {
        teacherRemark = `${studentName} shows good understanding and consistent effort in class activities. Well done.`;
        principalRemark = `Good academic progress. Aim for higher distinctions next term.`;
      } else if (avg >= 50) {
        teacherRemark = `${studentName} has made satisfactory progress but has potential for greater achievement with focused revision.`;
        principalRemark = `Satisfactory effort. Needs more commitment in core subjects to excel.`;
      } else {
        teacherRemark = `${studentName} requires closer guidance and sustained study to improve understanding of key topics.`;
        principalRemark = `Academic improvement needed. Parental supervision and remedial support recommended.`;
      }

      res.json({
        teacherRemark,
        principalRemark,
        source: 'local_fallback',
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      You are a professional school teacher and principal.
      Generate two separate remarks for a student named ${studentName} (${gender || 'Student'}).
      Academic Average: ${average}%
      Subject Performance: ${Array.isArray(subjects) ? subjects.map((s: any) => `${s.name}: ${s.score}`).join(', ') : 'N/A'}
      Behavioral Traits noticed: ${Array.isArray(traits) ? traits.join(', ') : 'N/A'}

      The teacher's remark should be encouraging, specific to the data, and professional (around 20-30 words).
      The principal's remark should be authoritative yet supportive, focusing on overall behavior and academic standing (around 15-20 words).

      Return the response in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teacherRemark: { type: Type.STRING },
            principalRemark: { type: Type.STRING },
          },
          required: ['teacherRemark', 'principalRemark'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      teacherRemark: parsed.teacherRemark || '',
      principalRemark: parsed.principalRemark || '',
      source: 'gemini_ai',
    });
  } catch (err: any) {
    console.error('[AI Remarks Error]', err);
    res.status(500).json({ error: 'Failed to generate AI remarks. ' + (err.message || '') });
  }
});

export default router;
