# Trading Platform Frontend

Modern web UI for the Broker Trading Platform built with Next.js and shadcn/ui.

## Features

- 📊 **Create Orders**: Interactive form to place buy/sell orders
- 📈 **Order Management**: View and manage your orders in real-time
- 🔍 **Query Orders**: Search for specific orders by ID
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- ⚡ **Real-time Updates**: Instant feedback on order execution

## Tech Stack

- **Next.js 15** - React framework with App Router
- **shadcn/ui** - High-quality UI components
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe development

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on \`http://localhost:8080\`

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

The UI will be available at \`http://localhost:3000\` (or another port if 3000 is occupied).

## Usage

### Create an Order

1. Navigate to the **Trade** tab
2. Select a portfolio (portfolio-id-1 through portfolio-id-4)
3. Choose a security (NVIDIA, Apple, or Microsoft)
4. Select order type (BUY or SELL)
5. Enter quantity
6. Click the button to execute

### View Orders

- Switch to the **Orders** tab to see all orders you've created
- Orders display ID, portfolio, security, side, quantity, price, and status
- You can cancel orders with status "CREATED"

### Query an Order

- Use the **Query Order** tab to retrieve specific orders by ID
- Enter the order ID and click "Query"

## API Integration

The frontend connects to the Spring Boot backend at \`http://localhost:8080\`:

- \`POST /orders\` - Create new order
- \`GET /orders/{id}\` - Retrieve order by ID
- \`PUT /orders/{id}\` - Cancel order

## Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## License

MIT
