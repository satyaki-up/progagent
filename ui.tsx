import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { runAgentWithEvents, AgentEvent } from './agent-runner';

const VERBS = [
    'Toiling', 'Working', 'Calculating', 'Computing', 'Analyzing', 'Processing', 'Evaluating',
    'Investigating', 'Examining', 'Scrutinizing', 'Deliberating', 'Contemplating', 'Pondering',
    'Ruminating', 'Musing', 'Reflecting', 'Considering', 'Weighing', 'Assessing', 'Assimilating',
    'Cogitating', 'Meditating', 'Brainstorming', 'Reasoning', 'Deducing', 'Inferring', 'Deriving',
    'Compiling', 'Constructing', 'Assembling', 'Building', 'Creating', 'Fabricating', 'Manufacturing',
    'Crafting', 'Forging', 'Sculpting', 'Carving', 'Shaping', 'Molding', 'Forming', 'Generating',
    'Producing', 'Developing', 'Designing', 'Planning', 'Strategizing', 'Organizing', 'Structuring',
    'Arranging', 'Coordinating', 'Orchestrating', 'Directing', 'Managing', 'Supervising', 'Overseeing',
    'Monitoring', 'Tracking', 'Scanning', 'Searching', 'Exploring', 'Probing', 'Delving', 'Diving',
    'Digging', 'Mining', 'Extracting', 'Harvesting', 'Gathering', 'Collecting', 'Accumulating',
    'Compiling', 'Aggregating', 'Consolidating', 'Synthesizing', 'Combining', 'Merging', 'Blending',
    'Integrating', 'Connecting', 'Linking', 'Binding', 'Unifying', 'Harmonizing', 'Balancing',
    'Optimizing', 'Enhancing', 'Improving', 'Refining', 'Polishing', 'Perfecting', 'Finalizing',
    'Completing', 'Finishing', 'Concluding', 'Resolving', 'Solving', 'Deciphering', 'Decoding',
    'Unraveling', 'Untangling', 'Unwinding', 'Disentangling', 'Unknotting', 'Discombobulating'
];

interface AgentState {
    prompt: string;
    isRunning: boolean;
    step: number;
    totalSteps: number;
    thinking: string;
    toolCalls: Array<{ toolName: string; args: string[] }>;
    toolResults: string[];
    answer: string | null;
    error: string | null;
}

function App() {
    const { exit } = useApp();
    const [input, setInput] = useState('');
    const [isWaitingForInput, setIsWaitingForInput] = useState(true);
    const [currentVerb, setCurrentVerb] = useState('Processing');
    const [verbColor, setVerbColor] = useState('cyanBright');
    const [agentState, setAgentState] = useState<AgentState>({
        prompt: '',
        isRunning: false,
        step: 0,
        totalSteps: 20,
        thinking: '',
        toolCalls: [],
        toolResults: [],
        answer: null,
        error: null,
    });

    const brightColors = ['cyanBright', 'greenBright', 'yellowBright', 'magentaBright', 'blueBright', 'redBright', 'whiteBright'];

    useEffect(() => {
        if (!agentState.isRunning) return;

        const interval = setInterval(() => {
            const randomVerb = VERBS[Math.floor(Math.random() * VERBS.length)];
            const randomColor = brightColors[Math.floor(Math.random() * brightColors.length)];
            setCurrentVerb(randomVerb);
            setVerbColor(randomColor);
        }, 2000);

        return () => clearInterval(interval);
    }, [agentState.isRunning]);

    const handleSubmit = async (prompt: string) => {
        if (!prompt.trim()) return;

        setAgentState({
            prompt: prompt.trim(),
            isRunning: true,
            step: 0,
            totalSteps: 20,
            thinking: '',
            toolCalls: [],
            toolResults: [],
            answer: null,
            error: null,
        });
        setInput('');
        setIsWaitingForInput(false);

        try {
            await runAgentWithEvents(prompt.trim(), (event: AgentEvent) => {
                setAgentState((prev) => {
                    const newState = { ...prev };
                    switch (event.type) {
                        case 'step':
                            newState.step = event.data?.step || 0;
                            if (event.data?.total) newState.totalSteps = event.data.total;
                            break;
                        case 'thinking':
                            newState.thinking = event.data?.reasoning || '';
                            break;
                        case 'tool_call':
                            newState.toolCalls = [
                                ...newState.toolCalls,
                                { toolName: event.data.toolName, args: event.data.args },
                            ];
                            newState.thinking = '';
                            break;
                        case 'tool_result':
                            newState.toolResults = [...newState.toolResults, event.data?.observation || ''];
                            break;
                        case 'answer':
                            newState.answer = event.data?.answer || null;
                            newState.isRunning = false;
                            setIsWaitingForInput(true);
                            break;
                        case 'error':
                            newState.error = event.data?.message || 'Unknown error';
                            newState.isRunning = false;
                            setIsWaitingForInput(true);
                            break;
                    }
                    return newState;
                });
            });
        } catch (error: any) {
            setAgentState((prev) => ({
                ...prev,
                error: error.message || 'Unknown error occurred',
                isRunning: false,
            }));
            setIsWaitingForInput(true);
        }
    };

    useInput((input, key) => {
        if (key.escape && !agentState.isRunning) {
            exit();
        }
    });

    const truncate = (text: string, maxLength: number = 200) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="cyan">
                    {' '}
                    ┌─────────────────────────────────────┐
                </Text>
            </Box>
            <Box marginBottom={1}>
                <Text bold color="cyan">
                    {' '}
                    │{' '}
                </Text>
                <Text bold color="green">
                    ProgAgent CLI
                </Text>
                <Text bold color="cyan">
                    {' '}
                    │
                </Text>
            </Box>
            <Box marginBottom={1}>
                <Text bold color="cyan">
                    {' '}
                    └─────────────────────────────────────┘
                </Text>
            </Box>

            {agentState.prompt && (
                <Box marginBottom={1} flexDirection="column">
                    <Text>
                        <Text color="gray">Task: </Text>
                        <Text color="yellow">{agentState.prompt}</Text>
                    </Text>
                </Box>
            )}

            {agentState.isRunning && (
                <Box marginBottom={1} flexDirection="column">
                    <Text>
                        <Text color="blue">Step {agentState.step}</Text>
                        <Text color="gray">/{agentState.totalSteps}</Text>
                    </Text>
                </Box>
            )}

            {agentState.thinking && (
                <Box marginBottom={1} flexDirection="column">
                    <Text color="dim">💭 {truncate(agentState.thinking)}</Text>
                </Box>
            )}

            {agentState.toolCalls.length > 0 && (
                <Box marginBottom={1} flexDirection="column">
                    {agentState.toolCalls.slice(-3).map((call, idx) => (
                        <Box key={idx} marginBottom={0}>
                            <Text color="magenta">
                                🔧 {call.toolName}({call.args.map((a) => `"${a}"`).join(', ')})
                            </Text>
                        </Box>
                    ))}
                </Box>
            )}

            {agentState.toolResults.length > 0 && (
                <Box marginBottom={1} flexDirection="column">
                    {agentState.toolResults.slice(-2).map((result, idx) => (
                        <Box key={idx} marginBottom={0}>
                            <Text color="dim">✓ {truncate(result, 150)}</Text>
                        </Box>
                    ))}
                </Box>
            )}

            {agentState.answer && (
                <Box marginBottom={1} flexDirection="column">
                    <Text color="green">✓ Task completed!</Text>
                    <Box marginTop={1} borderStyle="round" borderColor="green" padding={1}>
                        <Text>{agentState.answer}</Text>
                    </Box>
                </Box>
            )}

            {agentState.error && (
                <Box marginBottom={1} flexDirection="column">
                    <Text color="red">✗ {agentState.error}</Text>
                </Box>
            )}

            <Box marginTop={1}>
                <Text color="gray">{'> '}</Text>
                {isWaitingForInput ? (
                    <TextInput
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        placeholder="Enter a task for the agent (e.g., 'write a hello world program')"
                    />
                ) : (
                    <Text>
                        <Text color={verbColor as any} bold>{currentVerb}</Text>
                        <Text color="gray">... (Press ESC to exit when done)</Text>
                    </Text>
                )}
            </Box>

            <Box marginTop={1}>
                <Text color="dim" fontSize={11}>
                    Press ESC to exit
                </Text>
            </Box>
        </Box>
    );
}

export default App;

