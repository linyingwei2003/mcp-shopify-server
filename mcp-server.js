#!/usr/bin/env node

// MCP Server for Shopify - stdio transport
require('dotenv').config();
const axios = require('axios');

// MCP Server implementation using stdio
class MCPShopifyServer {
    constructor() {
        this.requestId = 0;
    }

    // Send a JSON-RPC message
    sendMessage(message) {
        const json = JSON.stringify(message);
        console.log(json);
    }

    // Send an error response
    sendError(id, code, message, data = null) {
        this.sendMessage({
            jsonrpc: "2.0",
            id,
            error: { code, message, data }
        });
    }

    // Send a success response
    sendResult(id, result) {
        this.sendMessage({
            jsonrpc: "2.0",
            id,
            result
        });
    }

    // Handle incoming messages
    async handleMessage(message) {
        try {
            const { method, params, id } = message;

            switch (method) {
                case 'initialize':
                    this.sendResult(id, {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: "mcp-shopify-server",
                            version: "1.0.0"
                        }
                    });
                    break;

                case 'tools/list':
                    this.sendResult(id, {
                        tools: [{
                            name: 'run_shopify_admin_query',
                            description: 'Executes a GraphQL query against the Shopify Admin API.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    query: {
                                        type: 'string',
                                        description: 'The GraphQL query string to execute.'
                                    }
                                },
                                required: ['query']
                            }
                        }]
                    });
                    break;

                case 'tools/call':
                    await this.handleToolCall(id, params);
                    break;

                default:
                    this.sendError(id, -32601, `Method not found: ${method}`);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.sendError(message.id || null, -32603, 'Internal error', error.message);
        }
    }

    // Handle tool execution
    async handleToolCall(id, params) {
        if (!params || params.name !== 'run_shopify_admin_query') {
            return this.sendError(id, -32602, 'Unknown tool or invalid parameters');
        }

        const { arguments: args } = params;
        
        if (!args || !args.query) {
            return this.sendError(id, -32602, 'Missing query argument');
        }

        try {
            const shopifyResponse = await axios.post(
                process.env.SHOPIFY_STORE_URL,
                { query: args.query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
                    },
                }
            );

            if (shopifyResponse.data.errors) {
                return this.sendError(id, -32603, 'GraphQL error from Shopify', shopifyResponse.data.errors);
            }

            this.sendResult(id, {
                content: [{
                    type: "text",
                    text: JSON.stringify(shopifyResponse.data, null, 2)
                }]
            });

        } catch (error) {
            const errorDetails = error.response ? error.response.data : error.message;
            this.sendError(id, -32603, 'Failed to execute Shopify query', errorDetails);
        }
    }

    // Start the server
    start() {
        console.error('MCP Shopify Server starting...');
        console.error('Shopify Store URL:', process.env.SHOPIFY_STORE_URL);
        console.error('Access Token available:', !!process.env.SHOPIFY_ACCESS_TOKEN);

        // Read from stdin line by line
        let buffer = '';
        
        process.stdin.on('data', (chunk) => {
            buffer += chunk.toString();
            
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                
                if (line) {
                    try {
                        const message = JSON.parse(line);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                }
            }
        });

        process.stdin.on('end', () => {
            console.error('MCP Server shutting down...');
            process.exit(0);
        });
    }
}

// Start the server
const server = new MCPShopifyServer();
server.start();
