# HeyGen MCP Server for Cloudflare Workers

A Model Context Protocol (MCP) server built with Cloudflare Workers that provides tools for mathematical operations and HeyGen video creation.

## Features

- **Add Tool**: Add two numbers together
- **Calculate Tool**: Perform mathematical operations (add, subtract, multiply, divide)
- **HeyGen Video Tool**: Create videos using the HeyGen API
- **MCP Protocol Support**: Compatible with Cursor and other MCP clients
- **Cloudflare Workers**: Deployable to Cloudflare's edge network

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.dev.vars` file in your project root:

```env
HEYGEN_API_KEY=your_heygen_api_key_here
```

### 3. Start Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:8787`

## Testing the MCP Server

### Direct HTTP Testing

```bash
# Test server info
curl http://localhost:8787/mcp

# Test tools list
curl http://localhost:8787/mcp/tools

# Test add tool
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "add", "arguments": {"a": 5, "b": 3}}'

# Test calculate tool
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "calculate", "arguments": {"operation": "multiply", "a": 4, "b": 5}}'

# Test HeyGen video tool (requires valid API key)
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "create_heygen_video", "arguments": {"avatar_id": "test", "voice_id": "test", "input_text": "Hello world!"}}'
```

### MCP Bridge Testing

```bash
# Test initialization
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node mcp-bridge.js

# Test tools list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node mcp-bridge.js

# Test tool call
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add","arguments":{"a":10,"b":20}}}' | node mcp-bridge.js
```

## Using with Cursor

### 1. Configure Cursor MCP

1. Open Cursor Settings
2. Go to Extensions > MCP
3. Add a new MCP server with the following configuration:
   - **Name**: `heygen-mcp`
   - **Command**: `node`
   - **Args**: `[path-to-your-project]/mcp-bridge.js`
   - **Working Directory**: `[path-to-your-project]`

### 2. Usage Examples

Once configured, you can ask Cursor to:

- "Add 5 and 3 using the add tool"
- "Calculate 10 multiplied by 5"
- "Create a HeyGen video with avatar_id 'abc123', voice_id 'xyz789', and text 'Hello world!'"

## Available Tools

### Add Tool
- **Name**: `add`
- **Description**: Add two numbers together
- **Parameters**:
  - `a` (number): First number
  - `b` (number): Second number

### Calculate Tool
- **Name**: `calculate`
- **Description**: Perform mathematical operations on two numbers
- **Parameters**:
  - `operation` (string): One of "add", "subtract", "multiply", "divide"
  - `a` (number): First number
  - `b` (number): Second number

### HeyGen Video Tool
- **Name**: `create_heygen_video`
- **Description**: Create a video using HeyGen API
- **Parameters**:
  - `avatar_id` (string): HeyGen avatar ID
  - `voice_id` (string): HeyGen voice ID
  - `input_text` (string): Text to convert to speech
  - `background` (string, optional): Background color

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

### Environment Variables

Make sure to set the `HEYGEN_API_KEY` environment variable in your Cloudflare Workers dashboard or using Wrangler:

```bash
wrangler secret put HEYGEN_API_KEY
```

## Architecture

- **Cloudflare Worker**: Main server running on Cloudflare's edge network
- **Durable Object**: Provides stateful behavior and SQL storage
- **MCP Bridge**: Node.js script that bridges HTTP requests to MCP protocol
- **HeyGen API Integration**: Direct integration with HeyGen's video generation API

## Development

### Project Structure

```
├── src/
│   └── index.ts          # Main Cloudflare Worker code
├── mcp-bridge.js         # MCP protocol bridge for Cursor
├── wrangler.jsonc        # Cloudflare Workers configuration
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

### Scripts

- `npm run dev`: Start development server
- `npm run deploy`: Deploy to Cloudflare Workers
- `npm run format`: Format code with Biome
- `npm run lint:fix`: Fix linting issues

## Troubleshooting

### Common Issues

1. **"SQL is not enabled"**: Make sure the migrations are properly configured in `wrangler.jsonc`
2. **"Cannot find module"**: Run `npm install` to install dependencies
3. **"HEYGEN_API_KEY not found"**: Set the environment variable in your development environment

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npm run dev
```

## License

MIT License - see LICENSE file for details.
