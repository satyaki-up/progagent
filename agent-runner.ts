import { callOllama } from './model';
import { runBashCommand } from './tools/bash-tool';
import { readFile, writeFile } from './tools/file-io';
import { parseToolFromResponse } from './tools/parsing';
import { validateToolArgs } from './tools/schemas';
import { Eta } from 'eta';

const eta = new Eta({ views: './templates' });

export interface AgentEvent {
    type: 'step' | 'thinking' | 'tool_call' | 'tool_result' | 'answer' | 'error';
    data?: any;
}

export type AgentEventListener = (event: AgentEvent) => void;

/**
 * Runs the agent with event callbacks for UI updates
 */
export async function runAgentWithEvents(
    prompt: string,
    onEvent: AgentEventListener
): Promise<string> {
    const systemPrompt = eta.render('system-prompt', {});

    let conversationHistory = `${systemPrompt}\n\nTask: ${prompt}\n\n`;
    let stepCount = 0;
    const maxSteps = 20;

    onEvent({ type: 'step', data: { step: 0, total: maxSteps, message: 'Starting agent...' } });

    while (stepCount < maxSteps) {
        stepCount++;
        onEvent({ type: 'step', data: { step: stepCount, total: maxSteps } });
        
        const modelResponse = await callOllama(conversationHistory);
        
        if (!modelResponse || !modelResponse.trim()) {
            const errorMsg = `Agent stopped: Model returned empty response after ${stepCount} steps.`;
            onEvent({ type: 'error', data: { message: errorMsg } });
            return errorMsg;
        }
        
        const reasoningMatch = modelResponse.match(/<think>([\s\S]*?)<\/think>/i);
        const reasoning = (reasoningMatch && reasoningMatch[1]) ? reasoningMatch[1].trim() : '';
        
        if (reasoning) {
            onEvent({ type: 'thinking', data: { reasoning } });
        }
        
        const answerMatch = modelResponse.match(/<answer>([\s\S]*?)<\/answer>/i);
        if (answerMatch && answerMatch[1]) {
            const answer = answerMatch[1].trim();
            onEvent({ type: 'answer', data: { answer } });
            return answer;
        }

        const toolMatch = modelResponse.match(/<tool>([\s\S]*?)<\/tool>/i);
        if (!toolMatch || !toolMatch[1]) {
            if (stepCount > 3) {
                conversationHistory += `Agent: ${modelResponse}\n\n`;
            }
            continue;
        }

        const parsedTool = parseToolFromResponse(toolMatch[1]);
        if (!parsedTool) {
            conversationHistory += `Agent: ${modelResponse}\n\n`;
            continue;
        }

        const { toolName, args, toolCall } = parsedTool;
        onEvent({ type: 'tool_call', data: { toolName, args, toolCall } });

        const validation = validateToolArgs(toolName, args);
        if (!validation.success) {
            const observation = `Error: ${validation.error}`;
            onEvent({ type: 'tool_result', data: { observation } });
            onEvent({ type: 'error', data: { message: observation } });
            conversationHistory += `<think>Validation failed</think>\n`;
            conversationHistory += `<tool>\n    <name>${toolName}</name>\n    <call>${toolCall}</call>\n</tool>\n\n`;
            conversationHistory += `OBSERVATION: ${observation}\n\n`;
            continue;
        }

        let observation: string;
        try {
            switch (toolName) {
                case 'runBashCommand': {
                    const command = args[0]!;
                    const bashResult = await runBashCommand(command);
                    observation = `Exit code: ${bashResult.status}\nOutput:\n${bashResult.output}`;
                    break;
                }

                case 'readFile': {
                    const filename = args[0]!;
                    const fileContent = await readFile(filename);
                    observation = `File contents:\n${fileContent}`;
                    break;
                }

                case 'writeFile': {
                    const filename = args[0]!;
                    const content = args[1]!;
                    await writeFile(filename, content);
                    observation = `Successfully wrote to ${filename}`;
                    break;
                }

                default:
                    observation = `Error: Unknown tool "${toolName}". Available tools: runBashCommand, readFile, writeFile`;
            }
        } catch (error: any) {
            observation = `Error executing ${toolName}: ${error.message}`;
            onEvent({ type: 'error', data: { message: observation } });
        }

        onEvent({ type: 'tool_result', data: { observation } });

        const thought = reasoning || 'Processing...';

        conversationHistory += `<think>${thought}</think>\n`;
        conversationHistory += `<tool>\n    <name>${toolName}</name>\n    <call>${toolCall}</call>\n</tool>\n\n`;
        conversationHistory += `OBSERVATION: ${observation}\n\n`;
    }

    const result = `Agent reached maximum steps (${maxSteps}). Last conversation state:\n${conversationHistory}`;
    onEvent({ type: 'error', data: { message: `Reached maximum steps (${maxSteps})` } });
    return result;
}

