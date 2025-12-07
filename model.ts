interface OllamaResponse {
    response?: string;
    thinking?: string;
}

export async function callOllama(prompt: string): Promise<string> {
    const requestBody = {
        model: 'gpt-oss:20b',
        prompt,
        stream: false,
    };
    
    // console.log('Request body:', JSON.stringify(requestBody));
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

    const data = await response.json() as OllamaResponse;
    // console.log('Response data:', JSON.stringify(data));
    
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

