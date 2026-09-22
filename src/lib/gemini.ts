import api from './api';

export async function generateAIRemarks(
  studentName: string,
  gender: 'Male' | 'Female',
  average: number,
  subjects: { name: string; score: number }[],
  traits: string[]
): Promise<{ teacherRemark: string; principalRemark: string }> {
  try {
    const response = await api.post('/ai/generate-remarks', {
      studentName,
      gender,
      average,
      subjects,
      traits,
    });

    return {
      teacherRemark: response.data.teacherRemark || '',
      principalRemark: response.data.principalRemark || '',
    };
  } catch (err: any) {
    console.error('Failed to generate remarks from server API:', err);
    throw new Error(err.response?.data?.error || 'Failed to generate remarks.');
  }
}
