# progagent

Coding agent.

[![Demo](https://img.youtube.com/vi/bTsR5GdWe5A/0.jpg)](https://www.youtube.com/watch?v=bTsR5GdWe5A)

## Prerequisites

### 1. Install and Run Ollama

First, make sure Ollama is installed and running:

```bash
# Install Ollama (if not already installed)
# Visit https://ollama.ai or use your package manager

# Start the Ollama server
ollama serve
```

The Ollama server should be running on `http://127.0.0.1:11434` (default port).

### 2. Pull the Required Model

Ensure you have the `gpt-oss:20b` model available:

```bash
ollama pull gpt-oss:20b
```

## Installation

Install dependencies:

```bash
bun install
```

## Usage

### Interactive CLI Mode (Recommended)

Run the interactive terminal interface:

```bash
bun run entrypoint.tsx
```

Or after installing/linking globally:

```bash
progagent
```

This will drop you into an interactive CLI where you can type commands for the agent. For example:
- `write a hello world program`

Press `ESC` to exit when done.

### Command-Line Argument Mode

Run the agent with a direct command:

```bash
bun run index.ts "Task description"

bun run index.ts "Write a simple python program which prints Hello, world to the console, and save it to a file called hello.py in the current directory."
```

### Run unit tests:

```bash
bun test ./agent-test.ts
```

### Run the test script (tests bash and file I/O tools):

```bash
bun run index.ts
```

## Project Structure

- `agent.ts` - Main agentic loop that uses the model and tools to accomplish tasks
- `agent-runner.ts` - Agent runner with event callbacks for UI integration
- `agent-test.ts` - Unit tests for the agent parsing functions
- `model.ts` - Ollama API client that calls the local LLM
- `index.ts` - Entry point for command-line argument mode
- `entrypoint.tsx` - Entry point for interactive CLI mode (uses Ink/React)
- `ui.tsx` - Interactive terminal UI component built with Ink
- `tools/bash-tool.ts` - Utility for running bash commands
- `tools/file-io.ts` - File read/write utilities
- `tools/parsing.ts` - Tool call parsing utilities
- `templates/system-prompt.eta` - Eta template for the agent system prompt
