import { z } from 'zod';

export const RunBashCommandArgsSchema = z.tuple([z.string().min(1, 'Command cannot be empty')]);

export const ReadFileArgsSchema = z.tuple([z.string().min(1, 'Filename cannot be empty')]);

export const WriteFileArgsSchema = z.tuple([
    z.string().min(1, 'Filename cannot be empty'),
    z.string(),
]);

export function validateToolArgs(toolName: string, args: string[]): { success: boolean; error?: string } {
    try {
        switch (toolName) {
            case 'runBashCommand':
                RunBashCommandArgsSchema.parse(args);
                break;
            case 'readFile':
                ReadFileArgsSchema.parse(args);
                break;
            case 'writeFile':
                WriteFileArgsSchema.parse(args);
                break;
            default:
                return { success: false, error: `Unknown tool "${toolName}"` };
        }
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((e) => e.message).join('; ');
            return { success: false, error: `Invalid arguments for ${toolName}: ${errorMessages}` };
        }
        return { success: false, error: `Validation error for ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

