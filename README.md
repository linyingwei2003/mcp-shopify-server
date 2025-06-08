# MCP Shopify Server

A Model Context Protocol (MCP) server that provides access to the Shopify Admin API via GraphQL queries.

## Features

- 🛍️ **Shopify Admin API Integration**: Execute GraphQL queries against your Shopify store
- 📋 **Schema Access**: Get the complete Shopify Admin API GraphQL schema
- 🔄 **Server-Sent Events**: Real-time connection using MCP protocol
- ⚡ **Error Handling**: Comprehensive error handling with detailed feedback
- 🧪 **Testing Suite**: Complete HTTP test suite included

## Tools Available

### `run_shopify_admin_query`
Executes GraphQL queries against the Shopify Admin API.

**Arguments:**
- `query` (string): The GraphQL query string to execute

**Example:**
```graphql
query {
  shop {
    name
    email
    domain
  }
}
```

### `get_shopify_schema`
Returns the Shopify Admin API GraphQL schema in SDL format from a local file.

**Arguments:** None

## Setup

### Prerequisites
- Node.js (v14 or higher)
- Shopify store with Admin API access
- Private app with Admin API access token

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/mcp-shopify-server.git
cd mcp-shopify-server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your Shopify credentials:
```
SHOPIFY_STORE_URL=https://your-store.myshopify.com/admin/api/2025-04/graphql.json
SHOPIFY_ACCESS_TOKEN=your_admin_api_access_token
```

4. Start the server:
```bash
npm start
```

The server will be available at `http://localhost:3000/mcp`

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_STORE_URL` | Your Shopify store's GraphQL endpoint | `https://mystore.myshopify.com/admin/api/2025-04/graphql.json` |
| `SHOPIFY_ACCESS_TOKEN` | Admin API access token | `shpat_xxxxxxxxxxxx` |
| `PORT` | Server port (optional) | `3000` |

### MCP Client Configuration

Add this to your MCP client configuration:

```json
{
  "mcp": {
    "servers": {
      "shopify-server": {
        "url": "http://localhost:3000/mcp"
      }
    }
  }
}
```

## API Endpoints

### MCP Protocol Endpoints

- `GET /mcp` - Server-Sent Events connection for MCP protocol
- `POST /mcp` - JSON-RPC method calls (initialize, tools/list, tools/call)

### Health Check

- `GET /` - Server health check and endpoint information

## Testing

Use the included `test.http` file to test all endpoints:

1. Test MCP connection
2. Initialize connection
3. List available tools
4. Execute Shopify queries
5. Test error handling

## Error Handling

The server provides comprehensive error handling:

- **GraphQL Errors**: Returns detailed Shopify API errors
- **Invalid Queries**: Validates query syntax and parameters
- **Connection Issues**: Handles network and authentication errors
- **File Errors**: Manages schema file reading errors

## Development

### Project Structure

```
├── index.js              # Main server file
├── test.http            # HTTP test cases
├── 2023-10.graphql      # Shopify GraphQL schema
├── .env                 # Environment variables
├── .gitignore           # Git ignore rules
└── package.json         # Node.js dependencies
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Check the [Issues](https://github.com/yourusername/mcp-shopify-server/issues) page
- Review Shopify's [Admin API documentation](https://shopify.dev/api/admin)
- Check MCP protocol [specification](https://modelcontextprotocol.io/)
