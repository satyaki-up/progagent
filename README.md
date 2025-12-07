# progagent

A TypeScript agent project that interacts with Ollama (local LLM) and provides utilities for running bash commands and file I/O operations.

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

### Run the model (calls Ollama):

```bash
bun run model.ts
```

### Run the test script (tests bash and file I/O tools):

```bash
bun run index.ts
```

## Project Structure

- `model.ts` - Ollama API client that calls the local LLM
- `index.ts` - Test script for bash and file I/O utilities
- `tools/bash_tool.ts` - Utility for running bash commands
- `tools/file_io.ts` - File read/write utilities

This project uses [Bun](https://bun.com), a fast all-in-one JavaScript runtime.
