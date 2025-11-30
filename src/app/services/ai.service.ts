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
        version: 'a16z6fc3c8e12b9f91a36ba6112a41cc1b7b9136d29fdf07afcff43c5f31ae59',
        input: {
          prompt: `Article title: "${title}"\n\nGenerate a JSON response with:\n1. description: 1-2 sentence description\n2. tags: array of 3-5 tags\n\nRespond ONLY with valid JSON, no other text.`
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
    let attempts = 0;
    const maxAttempts = 60;
    
    while (prediction.status === 'processing' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`
          }
        }
      );
      prediction = statusResponse.data;
      attempts++;
    }

    if (prediction.status === 'failed') {
      throw new Error('Prediction failed: ' + (prediction.error || 'Unknown error'));
    }

    if (prediction.status === 'processing') {
      throw new Error('Prediction timeout');
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
    throw new Error('Failed to generate content: ' + (error.response?.data?.detail || error.message));
  }
};
