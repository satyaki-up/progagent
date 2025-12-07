import { parse } from '@babel/parser';

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
    
    try {
        // Parse the function call as a JavaScript expression
        const ast = parse(`(${toolCall})`, {
            plugins: ['typescript'],
            sourceType: 'script',
        });
        
        // Extract the call expression
        const program = ast.program;
        if (program.body.length !== 1) {
            return null;
        }
        
        const firstStatement = program.body[0];
        if (!firstStatement || firstStatement.type !== 'ExpressionStatement') {
            return null;
        }
        
        const expr = firstStatement.expression;
        if (expr.type !== 'CallExpression') {
            return null;
        }
        
        // Extract function name
        if (expr.callee.type !== 'Identifier') {
            return null;
        }
        const toolName = expr.callee.name;
        
        // Extract arguments and convert to strings
        const args: string[] = [];
        for (const arg of expr.arguments) {
            if (arg.type === 'StringLiteral') {
                args.push(arg.value);
            } else if (arg.type === 'TemplateLiteral' && arg.quasis.length === 1 && arg.quasis[0]) {
                // Simple template literal with no expressions
                args.push(arg.quasis[0].value.raw);
            } else {
                // For other types, convert to string representation
                // This handles edge cases but may not be perfect
                return null;
            }
        }
        
        return { toolName, args, toolCall };
    } catch (error) {
        // Parsing failed - return null
        return null;
    }
}

