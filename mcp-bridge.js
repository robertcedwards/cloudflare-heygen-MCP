#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const MCP_SERVER_URL = 'http://localhost:8787';

// MCP Protocol implementation
class MCPBridge {
  constructor() {
    this.requestId = 1;
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    try {
      const response = await fetch(`${MCP_SERVER_URL}/mcp/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending request:', error);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -1,
          message: error.message
        }
      };
    }
  }

  async handleInitialize(params) {
    return {
      jsonrpc: '2.0',
      id: params.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'HeyGen MCP Bridge',
          version: '1.0.0'
        }
      }
    };
  }

  async handleToolsList(params) {
    const tools = [
      {
        name: 'add',
        description: 'Add two numbers together',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' }
          },
          required: ['a', 'b']
        }
      },
      {
        name: 'calculate',
        description: 'Perform mathematical operations on two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'Mathematical operation to perform'
            },
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' }
          },
          required: ['operation', 'a', 'b']
        }
      },
      {
        name: 'create_heygen_video',
        description: 'Create a video using HeyGen API',
        inputSchema: {
          type: 'object',
          properties: {
            avatar_id: { type: 'string', description: 'HeyGen avatar ID' },
            voice_id: { type: 'string', description: 'HeyGen voice ID' },
            input_text: { type: 'string', description: 'Text to convert to speech' },
            background: { type: 'string', description: 'Background color (optional)' }
          },
          required: ['avatar_id', 'voice_id', 'input_text']
        }
      }
    ];

    return {
      jsonrpc: '2.0',
      id: params.id,
      result: { tools }
    };
  }

  async handleToolsCall(params) {
    const { name, arguments: args } = params.params;
    
    try {
      const response = await fetch(`${MCP_SERVER_URL}/mcp/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          arguments: args
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        jsonrpc: '2.0',
        id: params.id,
        result: {
          content: result.content
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: params.id,
        error: {
          code: -1,
          message: error.message
        }
      };
    }
  }
}

const bridge = new MCPBridge();

// Handle incoming JSON-RPC requests
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    let response;
    
    switch (request.method) {
      case 'initialize':
        response = await bridge.handleInitialize(request);
        break;
      case 'tools/list':
        response = await bridge.handleToolsList(request);
        break;
      case 'tools/call':
        response = await bridge.handleToolsCall(request);
        break;
      default:
        response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        };
    }
    
    console.log(JSON.stringify(response));
  } catch (error) {
    console.error('Error processing request:', error);
    const errorResponse = {
      jsonrpc: '2.0',
      id: request?.id || null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

// Handle process termination
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
}); 