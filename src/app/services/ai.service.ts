import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const generateArticleContent = async (title: string) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Given this article title: "${title}"\n\nGenerate:\n1. A brief description (1-2 paragraphs 8-9 lines each) for the article\n2. 3-5 relevant tags\n\nFormat your response as JSON:\n{\n  "description": "...",\n  "tags": ["tag1", "tag2", "tag3"]\n}`
          }]
        }]
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
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
