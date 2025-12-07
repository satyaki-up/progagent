import { Eta } from 'eta';
import { callOllama } from './model';
import { runBashCommand } from './tools/bash-tool';
import { readFile, writeFile } from './tools/file-io';

const eta = new Eta({ views: './templates' });

export interface ParsedTool {
    toolName: string;
    args: string[];
    toolCall: string;
}

/**
 * Parses a tool tag from the model response and extracts the tool name and arguments.
 * @param toolContent - The content inside the <tool>...</tool> tags
 * @returns Parsed tool information or null if parsing fails
 */
export function parseToolFromResponse(toolContent: string): ParsedTool | null {
    const nameMatch = toolContent.match(/<name>([\s\S]*?)<\/name>/i);
    const callMatch = toolContent.match(/<call>([\s\S]*?)<\/call>/i);
    
    if (!nameMatch || !callMatch || !nameMatch[1] || !callMatch[1]) {
        return null;
    }

    const toolCall = callMatch[1].trim();
    
    // Parse function call handling nested parentheses and quoted strings
    let toolName = '';
    let argsString = '';
    let parenCount = 0;
    let inQuotes = false;
    let quoteChar = '';
    let i = 0;
    
    // Extract function name
    while (i < toolCall.length && toolCall[i] !== undefined && /\w/.test(toolCall[i] ?? '')) {
        toolName += toolCall[i] ?? '';
        i++;
    }
    
    // Skip whitespace and opening parenthesis
    while (i < toolCall.length && (toolCall[i] === ' ' || toolCall[i] === '(')) {
        if (toolCall[i] === '(') {
            parenCount = 1;
            i++;
            break;
        }
        i++;
    }
    
    // Extract arguments string, handling nested parentheses and quotes
    let startIdx = i;
    while (i < toolCall.length) {
        const char = toolCall[i];
        const nextChar = i + 1 < toolCall.length ? toolCall[i + 1] : undefined;
        
        if (!inQuotes && char === '(') {
            parenCount++;
        } else if (!inQuotes && char === ')') {
            parenCount--;
            if (parenCount === 0) {
                argsString = toolCall.substring(startIdx, i);
                break;
            }
        } else if (!inQuotes && (char === '"' || char === "'")) {
            inQuotes = true;
            quoteChar = char;
        } else if (inQuotes && char === '\\' && nextChar !== undefined) {
            // Escaped character (including escaped quotes) - include both in argsString
            i += 2;
            continue;
        } else if (inQuotes && char === quoteChar) {
            inQuotes = false;
            quoteChar = '';
        }
        i++;
    }
    
    if (!toolName || parenCount !== 0) {
        return null;
    }
    
    argsString = argsString.trim();
    
    const args: string[] = [];
    if (argsString) {
        // Parse arguments handling escaped quotes properly
        let currentArg = '';
        inQuotes = false;
        quoteChar = '';
        i = 0;
        
        while (i < argsString.length) {
            const char = argsString[i];
            const nextChar = i + 1 < argsString.length ? argsString[i + 1] : undefined;
            
            if (!inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
                i++;
            } else if (inQuotes && char === quoteChar && nextChar !== quoteChar) {
                // Closing quote (not escaped)
                inQuotes = false;
                args.push(currentArg);
                currentArg = '';
                quoteChar = '';
                i++;
                // Skip comma and whitespace after closing quote
                while (i < argsString.length && (argsString[i] === ',' || argsString[i] === ' ')) {
                    i++;
                }
            } else if (inQuotes && char === '\\' && nextChar !== undefined) {
                // Escaped character (quote, newline, etc.)
                if (nextChar === quoteChar) {
                    // Escaped quote - add just the quote
                    currentArg += quoteChar;
                } else if (nextChar === 'n') {
                    // Escaped newline
                    currentArg += '\n';
                } else if (nextChar === 't') {
                    // Escaped tab
                    currentArg += '\t';
                } else {
                    // Other escape sequence - include both characters
                    currentArg += char + nextChar;
                }
                i += 2;
            } else if (inQuotes) {
                currentArg += char;
                i++;
            } else if (char === ',') {
                if (currentArg.trim()) {
                    args.push(currentArg.trim());
                    currentArg = '';
                }
                i++;
            } else if (char !== ' ') {
                currentArg += char;
                i++;
            } else {
                i++;
            }
        }
        
        if (currentArg.trim()) {
            args.push(currentArg.trim());
        }
    }

    return { toolName, args, toolCall };
}

/**
 * Runs a ReAct-style agentic loop that uses the model and tools to accomplish a task.
 * @param prompt - The task/objective to accomplish
 * @returns The final result from the agent
 */
export async function runAgent(prompt: string): Promise<string> {
    const systemPrompt = eta.render('system-prompt', {});

    let conversationHistory = `${systemPrompt}\n\nTask: ${prompt}\n\n`;
    let stepCount = 0;
    const maxSteps = 20;

    while (stepCount < maxSteps) {
        stepCount++;
        console.log(`\n--- Step ${stepCount} ---`);
        
        const modelResponse = await callOllama(conversationHistory);
        console.log('Model response:', modelResponse || '(empty)');
        
        if (!modelResponse || !modelResponse.trim()) {
            console.warn('Received empty response from model. Stopping agent loop.');
            return `Agent stopped: Model returned empty response after ${stepCount} steps.`;
        }
        
        const reasoningMatch = modelResponse.match(/<think>([\s\S]*?)<\/think>/i);
        const reasoning = (reasoningMatch && reasoningMatch[1]) ? reasoningMatch[1].trim() : '';
        
        const answerMatch = modelResponse.match(/<answer>([\s\S]*?)<\/answer>/i);
        if (answerMatch && answerMatch[1]) {
            // Answer.
            return answerMatch[1].trim();
        }

        const toolMatch = modelResponse.match(/<tool>([\s\S]*?)<\/tool>/i);
        if (!toolMatch || !toolMatch[1]) {
            if (stepCount > 3) {
                console.warn('Warning: No tool tag found in response. Adding to history.');
            }
            conversationHistory += `Agent: ${modelResponse}\n\n`;
            continue;
        }

        const parsedTool = parseToolFromResponse(toolMatch[1]);
        if (!parsedTool) {
            console.warn('Warning: Could not parse tool from response. Adding to history.');
            conversationHistory += `Agent: ${modelResponse}\n\n`;
            continue;
        }

        const { toolName, args, toolCall } = parsedTool;
        console.log(`Executing tool: ${toolName}(${args.join(', ')})`);

        let observation: string;
        try {
            switch (toolName) {
                case 'runBashCommand':
                    if (args.length !== 1 || !args[0]) {
                        observation = `Error: runBashCommand requires 1 argument (command), got ${args.length}`;
                        break;
                    }
                    const bashResult = await runBashCommand(args[0]);
                    observation = `Exit code: ${bashResult.status}\nOutput:\n${bashResult.output}`;
                    break;

                case 'readFile':
                    if (args.length !== 1 || !args[0]) {
                        observation = `Error: readFile requires 1 argument (filename), got ${args.length}`;
                        break;
                    }
                    const fileContent = await readFile(args[0]);
                    observation = `File contents:\n${fileContent}`;
                    break;

                case 'writeFile':
                    if (args.length !== 2 || !args[0] || !args[1]) {
                        observation = `Error: writeFile requires 2 arguments (filename, content), got ${args.length}`;
                        break;
                    }
                    await writeFile(args[0], args[1]);
                    observation = `Successfully wrote to ${args[0]}`;
                    break;

                default:
                    observation = `Error: Unknown tool "${toolName}". Available tools: runBashCommand, readFile, writeFile`;
            }
        } catch (error: any) {
            observation = `Error executing ${toolName}: ${error.message}`;
        }

        console.log('Tool result:', observation);

        const thought = reasoning || 'Processing...';

        conversationHistory += `<think>${thought}</think>\n`;
        conversationHistory += `<tool>\n    <name>${toolName}</name>\n    <call>${toolCall}</call>\n</tool>\n\n`;
        conversationHistory += `OBSERVATION: ${observation}\n\n`;
    }

    return `Agent reached maximum steps (${maxSteps}). Last conversation state:\n${conversationHistory}`;
}

await runAgent('Implement a simple python program which prints "Hello, world!" to the console, and save it to a file called hello.py in the current directory.');
