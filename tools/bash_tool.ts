import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Executes a bash command and returns its stdout/stderr combined output and exit status.
 *
 * @param command - The bash command to execute.
 * @returns An object containing `output` (string) and `status` (number, exit code).
 */
export async function runBashCommand(command: string): Promise<{ output: string; status: number }> {
    try {
        const { stdout, stderr } = await execAsync(command, { shell: '/bin/bash' });
        const output = stdout + (stderr ? `\n${stderr}` : '');
        return { output, status: 0 };
    } catch (error: any) {
        const output = (error.stdout ?? '') + (error.stderr ?? '');
        const status = error.code ?? 1;
        return { output, status };
    }
}
