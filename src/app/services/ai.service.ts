import axios from 'axios';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export const generateArticleContent = async (title: string) => {
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  try {
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'e5582ad7cf78c7d6d26d3a3460efc33e0681084fbf74432332b70aa1e1476cbc',
        input: {
          prompt: `Given this article title: "${title}"\n\nGenerate:\n1. A brief description (1-2 sentences) for the article\n2. 3-5 relevant tags\n\nFormat your response as JSON:\n{\n  "description": "...",\n  "tags": ["tag1", "tag2", "tag3"]\n}`
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const predictionId = response.data.id;
    let prediction = response.data;
    
    while (prediction.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`
          }
        }
      );
      prediction = statusResponse.data;
    }

    if (prediction.status === 'failed') {
      throw new Error('Prediction failed');
    }

    const text = Array.isArray(prediction.output) ? prediction.output.join('') : prediction.output;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      description: parsed.description || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : []
    };
  } catch (error: any) {
    console.error('Replicate generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate content: ' + (error.response?.data?.detail?.[0]?.msg || error.message));
  }
};
