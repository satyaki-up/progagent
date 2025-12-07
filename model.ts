import { z } from 'zod';

const OllamaResponseSchema = z.object({
    response: z.string().optional(),
    thinking: z.string().optional(),
});

type OllamaResponse = z.infer<typeof OllamaResponseSchema>;

export async function callOllama(prompt: string): Promise<string> {
    const model = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
    const requestBody = {
        model,
        prompt,
        stream: false,
    };
    
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama API request failed with status ${response.status}: ${errText}`);
    }

    const jsonData = await response.json();
    
    const parseResult = OllamaResponseSchema.safeParse(jsonData);
    if (!parseResult.success) {
        console.warn('Warning: Ollama API response does not match expected schema');
        console.warn('Validation errors:', parseResult.error.issues);
        console.warn('Response data:', JSON.stringify(jsonData).substring(0, 500));
        return '';
    }
    
    const data = parseResult.data;
    
    if (data.response) {
        return data.response;
    }
    
    if (data.thinking) {
        return data.thinking;
    }
    
    console.warn('Warning: No response or thinking field in Ollama API response');
    console.warn('Response data:', JSON.stringify(data).substring(0, 500));
    return '';
}

