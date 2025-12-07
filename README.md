# progagent

Coding agent.

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

### Run the agent:

```bash
bun run agent.ts
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
- `agent-test.ts` - Unit tests for the agent parsing functions
- `model.ts` - Ollama API client that calls the local LLM
- `index.ts` - Test script for bash and file I/O utilities
- `tools/bash-tool.ts` - Utility for running bash commands
- `tools/file-io.ts` - File read/write utilities
- `templates/system-prompt.eta` - Eta template for the agent system prompt
