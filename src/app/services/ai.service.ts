import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const generateArticleContent = async (title: string) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Given this article title: "${title}"

Generate:
1. A brief description (1-2 sentences) for the article
2. 3-5 relevant tags

Format your response as JSON:
{
  "description": "...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      description: parsed.description || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : []
    };
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate content');
  }
};
