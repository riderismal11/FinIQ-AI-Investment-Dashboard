export type JsonSchema = {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  description?: string;
  enum?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export const portfolioToolDefinitions: AiToolDefinition[] = [
  {
    name: 'updateInvestmentAmount',
    description: 'Update the total investment amount in USD.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'New total investment amount in USD.',
        },
      },
      required: ['amount'],
    },
  },
  {
    name: 'updateRiskProfile',
    description: "Update the user's risk tolerance.",
    parameters: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: "'conservative', 'moderate', or 'aggressive'.",
          enum: ['conservative', 'moderate', 'aggressive'],
        },
      },
      required: ['profile'],
    },
  },
  {
    name: 'updateTimeHorizon',
    description: 'Update the investment horizon in years.',
    parameters: {
      type: 'object',
      properties: {
        years: {
          type: 'number',
          description: 'New investment horizon in years.',
        },
      },
      required: ['years'],
    },
  },
  {
    name: 'addAsset',
    description: 'Add or update an asset in the portfolio.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: "Yahoo Finance ticker (e.g. 'AAPL', 'GLD', 'BTC-USD').",
        },
        allocation: {
          type: 'number',
          description: 'Percentage allocation for this asset (1-100).',
        },
      },
      required: ['symbol', 'allocation'],
    },
  },
  {
    name: 'removeAsset',
    description: 'Remove an asset from the portfolio by its ticker symbol.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: "Ticker symbol to remove (e.g. 'NVDA').",
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'replacePortfolio',
    description: 'Replace the entire portfolio with a new set of assets.',
    parameters: {
      type: 'object',
      properties: {
        assets: {
          type: 'array',
          description: 'Array of assets for the new portfolio.',
          items: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Yahoo Finance ticker symbol.',
              },
              name: {
                type: 'string',
                description: 'Human-readable asset name.',
              },
              allocation: {
                type: 'number',
                description: 'Percentage allocation (1-100). All must sum to 100.',
              },
              type: {
                type: 'string',
                description: 'Asset category.',
              },
            },
            required: ['symbol', 'name', 'allocation', 'type'],
          },
        },
        riskProfile: {
          type: 'string',
          description: "Risk profile: 'conservative', 'moderate', or 'aggressive'.",
          enum: ['conservative', 'moderate', 'aggressive'],
        },
      },
      required: ['assets', 'riskProfile'],
    },
  },
];
