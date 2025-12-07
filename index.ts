import { runBashCommand } from './tools/bash_tool';
import { readFile } from './tools/file_io';

(async () => {
    // Test bash command runner
    const { output, status } = await runBashCommand('ls -l');
    console.log('Command output:', output.trim());
    console.log('Exit status:', status);

    // Test file_io readFile by reading README.md
    try {
        const readme = await readFile('README.md');
        console.log('README.md first 200 chars:', readme.slice(0, 200).replace(/\n/g, ' '));
    } catch (e) {
        console.error('Failed to read README.md:', e);
    }
})();