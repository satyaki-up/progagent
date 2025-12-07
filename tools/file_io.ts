import { promises as fs } from 'fs';

/**
 * Reads the entire contents of a file.
 * @param filename - Path to the file to read.
 * @returns The file contents as a string.
 */
export async function readFile(filename: string): Promise<string> {
    const data = await fs.readFile(filename, { encoding: 'utf8' });
    return data;
}

/**
 * Overwrites a file with the provided content.
 * @param filename - Path to the file to write.
 * @param content - The content to write to the file.
 */
export async function writeFile(filename: string, content: string): Promise<void> {
    await fs.writeFile(filename, content, { encoding: 'utf8' });
}
