import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const generateArticleContent = async (title: string) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Given this article title: "${title}"\n\nGenerate:\n1. A brief description (1-2 sentences) for the article\n2. 3-5 relevant tags\n\nFormat your response as JSON:\n{\n  "description": "...",\n  "tags": ["tag1", "tag2", "tag3"]\n}`
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content;
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
    console.error('OpenAI generation error:', error);
    throw new Error('Failed to generate content');
  }
};
