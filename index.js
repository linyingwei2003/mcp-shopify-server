// index.js
require('dotenv').config();

// --- START OF DEBUGGING BLOCK ---
console.log('--- DEBUGGING ENV VARIABLES ---');
console.log('Store URL Loaded:', process.env.SHOPIFY_STORE_URL);
if (process.env.SHOPIFY_ACCESS_TOKEN) {
    console.log('Access Token Loaded: Yes, first 5 chars are "' + process.env.SHOPIFY_ACCESS_TOKEN.substring(0, 5) + '"');
} else {
    console.log('Access Token Loaded: NO, THE VARIABLE IS UNDEFINED');
}
console.log('-----------------------------');
// --- END OF NEW DEBUGGING BLOCK ---


const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'MCP Shopify Server is running',
        endpoints: {
            mcp: '/mcp',
            health: '/'
        }
    });
});

// We are keeping the endpoint at /mcp
// index.js

// ... (keep all the code above this line the same) ...

// MCP SSE Connection Endpoint
app.get('/mcp', (req, res) => {
    console.log('=== MCP SSE Connection Established ===');
    
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });

    console.log('SSE headers sent, connection established');

    // Send initial connection message
    const welcomeMessage = {
        type: 'connection',
        message: 'MCP Shopify Server connected'
    };
    res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
        console.log('MCP SSE Client disconnected');
        res.end();
    });

    req.on('aborted', () => {
        console.log('MCP SSE Connection aborted');
        res.end();
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    }, 30000); // Send heartbeat every 30 seconds

    req.on('close', () => {
        clearInterval(heartbeat);
    });
});

// MCP JSON-RPC endpoint for method calls
app.post('/mcp', (req, res) => {
    console.log('=== MCP JSON-RPC Request ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
      const { method, params, id } = req.body;
    
    try {
        switch (method) {
            case 'initialize':
                const initResponse = {
                    jsonrpc: "2.0",
                    id: id,
                    result: {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {},
                            logging: {}
                        },
                        serverInfo: {
                            name: "mcp-shopify-server",
                            version: "1.0.0"
                        }
                    }
                };
                console.log('Sending initialize response');
                return res.json(initResponse);
                
            case 'notifications/initialized':
                // This is a notification (no response required)
                console.log('Client initialization notification received');
                return res.status(200).end(); // Acknowledge the notification
                  case 'tools/list':
                const toolsResponse = {
                    jsonrpc: "2.0",
                    id: id,
                    result: {
                        tools: [{
                            name: 'run_shopify_admin_query',
                            description: 'Executes a GraphQL query against the Shopify Admin API. Use this tool to run any valid GraphQL query against your Shopify store. Make sure to provide a valid query string in the input.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    query: {
                                        type: 'string',
                                        description: 'The GraphQL query string to execute.'
                                    }
                                },
                                required: ['query']
                            }                        }, {
                            name: 'get_shopify_schema',
                            description: 'Returns the Shopify Admin API GraphQL schema in SDL (Schema Definition Language) format from a local GraphQL file. It provides the complete schema definition for the Shopify Admin API',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        }]
                    }
                };
                console.log('Sending tools list response');
                return res.json(toolsResponse);
                
            case 'tools/call':
                return handleToolCall(req, res);
                  default:
                console.log('Unknown method:', method);
                return res.json({
                    jsonrpc: "2.0",
                    id: id,
                    error: {
                        code: -32601,
                        message: `Method not found: ${method}`
                    }
                });
        }    } catch (error) {
        console.error('Error processing MCP request:', error);
        return res.json({
            jsonrpc: "2.0",
            id: id,
            error: {
                code: -32603,
                message: "Internal error",
                data: error.message
            }
        });
    }
});

// Handle tool execution
async function handleToolCall(req, res) {
    const { params, id } = req.body;
      if (!params) {
        return res.json({
            jsonrpc: "2.0",
            id: id,
            error: {
                code: -32602,
                message: 'Missing parameters'
            }
        });
    }

    const toolName = params.name;
    
    switch (toolName) {
        case 'run_shopify_admin_query':
            return handleShopifyQuery(req, res);
        
        case 'get_shopify_schema':
            return handleGetSchema(req, res);
          default:
            return res.json({
                jsonrpc: "2.0",
                id: id,
                error: {
                    code: -32602,
                    message: 'Unknown tool: ' + toolName
                }
            });
    }
}

// Handle Shopify GraphQL query execution
async function handleShopifyQuery(req, res) {
    const { params, id } = req.body;
    const { arguments: args } = params;
      if (!args || !args.query) {
        return res.json({
            jsonrpc: "2.0",
            id: id,
            error: {
                code: -32602,
                message: 'Missing query argument'
            }
        });
    }

    console.log(`Executing Shopify query: ${args.query}`);

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
        );        if (shopifyResponse.data.errors) {
            console.error('Shopify GraphQL Errors:', shopifyResponse.data.errors);
            
            // Format the error message for better readability
            const errorMessages = shopifyResponse.data.errors.map(err => {
                let msg = err.message;
                if (err.path && err.path.length > 0) {
                    msg += ` (at ${err.path.join('.')})`;
                }
                return msg;
            }).join('; ');
            
            return res.json({
                jsonrpc: "2.0",
                id: id,
                error: {
                    code: -32603,
                    message: `Shopify GraphQL Error: ${errorMessages}`,
                    data: {
                        shopifyErrors: shopifyResponse.data.errors,
                        query: args.query,
                        errorCount: shopifyResponse.data.errors.length
                    }
                }
            });
        }

        return res.json({
            jsonrpc: "2.0",
            id: id,
            result: {
                content: [{
                    type: "text",
                    text: JSON.stringify(shopifyResponse.data, null, 2)
                }]
            }
        });    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('Error calling Shopify API:', errorDetails);
        return res.json({
            jsonrpc: "2.0",
            id: id,
            error: {
                code: -32603,
                message: 'Failed to execute Shopify query',
                data: errorDetails
            }
        });
    }
}

// Handle getting Shopify schema from local GraphQL file
async function handleGetSchema(req, res) {
    const { id } = req.body;
    
    try {
        console.log('Reading Shopify GraphQL schema from local file...');
        const schemaPath = path.join(__dirname, '2023-10.graphql');
          // Check if file exists
        if (!fs.existsSync(schemaPath)) {
            return res.json({
                jsonrpc: "2.0",
                id: id,
                error: {
                    code: -32603,
                    message: 'GraphQL schema file not found',
                    data: `File not found at: ${schemaPath}`
                }
            });
        }

        const schemaData = fs.readFileSync(schemaPath, 'utf8');

        return res.json({
            jsonrpc: "2.0",
            id: id,
            result: {
                content: [{
                    type: "text",
                    text: schemaData
                }]
            }
        });    } catch (error) {
        console.error('Error reading GraphQL schema file:', error);
        return res.json({
            jsonrpc: "2.0",
            id: id,
            error: {
                code: -32603,
                message: 'Failed to read GraphQL schema file',
                data: error.message
            }
        });
    }
}


// Remove the old /mcp/request endpoint since we now handle everything in /mcp


// Start the server
app.listen(PORT, () => {
    console.log(`MCP Server running on http://localhost:${PORT}`);
    console.log(`MCP endpoint is at http://localhost:${PORT}/mcp`);
});