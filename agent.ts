import { Eta } from 'eta';
import { callOllama } from './model';
import { runBashCommand } from './tools/bash-tool';
import { readFile, writeFile } from './tools/file-io';
import { parseToolFromResponse } from './tools/parsing';

const eta = new Eta({ views: './templates' });

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
