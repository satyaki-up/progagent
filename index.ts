import { runBashCommand } from './tools/bash-tool';
import { readFile } from './tools/file-io';
import { runAgent } from './agent';

(async () => {
    // const { output, status } = await runBashCommand('ls -l');
    // console.log('Command output:', output.trim());
    // console.log('Exit status:', status);

    // try {
    //     const readme = await readFile('README.md');
    //     console.log('README.md first 200 chars:', readme.slice(0, 200).replace(/\n/g, ' '));
    // } catch (e) {
    //     console.error('Failed to read README.md:', e);
    // }

    // Run the agent with CLI arguments
    const prompt = process.argv.slice(2).join(' ');
    if (prompt) {
        await runAgent(prompt);
    }
})();