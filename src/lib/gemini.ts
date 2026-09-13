import { GoogleGenAI, Type } from "@google/genai";
import { Student, PerformanceReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateAIRemarks(
  studentName: string, 
  gender: 'Male' | 'Female',
  average: number, 
  subjects: { name: string, score: number }[],
  traits: string[]
): Promise<{ teacherRemark: string, principalRemark: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  const prompt = `
    You are a professional school teacher and principal. 
    Generate two separate remarks for a student named ${studentName} (${gender}).
    Academic Average: ${average}%
    Subject Performance: ${subjects.map(s => `${s.name}: ${s.score}`).join(", ")}
    Behavioral Traits noticed: ${traits.join(", ")}
    
    The teacher's remark should be encouraging, specific to the data, and professional (around 20-30 words).
    The principal's remark should be authoritative yet supportive, focusing on overall behavior and academic standing (around 15-20 words).
    
    Return the response in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          teacherRemark: { type: Type.STRING },
          principalRemark: { type: Type.STRING },
        },
        required: ["teacherRemark", "principalRemark"],
      },
    },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    teacherRemark: data.teacherRemark || "",
    principalRemark: data.principalRemark || ""
  };
}
