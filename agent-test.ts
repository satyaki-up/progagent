import { test, expect } from 'bun:test';
import { parseToolFromResponse } from './agent';

test('parseToolFromResponse - basic writeFile call', () => {
    const toolContent = `
    <name>writeFile</name>
    <call>writeFile("hello.py", "print('Hello')")</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('writeFile');
    expect(result?.args).toEqual(['hello.py', "print('Hello')"]);
    expect(result?.toolCall).toBe('writeFile("hello.py", "print(\'Hello\')")');
});

test('parseToolFromResponse - readFile call', () => {
    const toolContent = `
    <name>readFile</name>
    <call>readFile("README.md")</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('readFile');
    expect(result?.args).toEqual(['README.md']);
});

test('parseToolFromResponse - runBashCommand call', () => {
    const toolContent = `
    <name>runBashCommand</name>
    <call>runBashCommand("ls -la")</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('runBashCommand');
    expect(result?.args).toEqual(['ls -la']);
});

test('parseToolFromResponse - writeFile with escaped tab', () => {
    const toolContent = `
    <name>writeFile</name>
    <call>writeFile("test.txt", "line1\tline2")</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('writeFile');
    expect(result?.args[1]).toContain('\t');
});

test('parseToolFromResponse - missing name tag', () => {
    const toolContent = `
    <call>writeFile("test.txt", "content")</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).toBeNull();
});

test('parseToolFromResponse - missing call tag', () => {
    const toolContent = `
    <name>writeFile</name>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).toBeNull();
});

test('parseToolFromResponse - invalid function call', () => {
    const toolContent = `
    <name>writeFile</name>
    <call>writeFile("test.txt"</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).toBeNull();
});

test('parseToolFromResponse - nested parentheses in string', () => {
    const toolContent = `
    <name>writeFile</name>
    <call>writeFile("test.py", "def foo(): pass")</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('writeFile');
    expect(result?.args).toEqual(['test.py', 'def foo(): pass']);
});

test('parseToolFromResponse - empty arguments', () => {
    const toolContent = `
    <name>someFunction</name>
    <call>someFunction()</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('someFunction');
    expect(result?.args).toEqual([]);
});

test('parseToolFromResponse - single quotes', () => {
    const toolContent = `
    <name>writeFile</name>
    <call>writeFile('test.txt', 'content')</call>
    `;
    
    const result = parseToolFromResponse(toolContent);
    
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe('writeFile');
    expect(result?.args).toEqual(['test.txt', 'content']);
});

