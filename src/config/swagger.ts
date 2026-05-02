import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Game Store API',
      version: '1.0.0',
      description: 'Game Store — Express + TypeScript + PostgreSQL + Redis',
    },
    servers: [
      { url: 'https://7f0bzp1p-3000.inc1.devtunnels.ms', description: 'Dev Tunnel (Public)' },
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        UserStatus: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
        },
        Genre: {
          type: 'string',
          enum: ['ACTION', 'ADVENTURE', 'PUZZLE', 'STRATEGY', 'SPORTS', 'RPG', 'SIMULATION', 'OTHER'],
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Server health check' },
      { name: 'Auth', description: 'Signup, login, profile completion' },
      { name: 'Games', description: 'Browse and play games (approved users only)' },
      { name: 'Admin', description: 'Admin — manage users and games' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Server is running',
              content: { 'application/json': { example: { status: 'ok' } } },
            },
          },
        },
      },

      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          description: 'Rate limited: 5 requests/min per IP.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'player@test.com' },
                    password: { type: 'string', example: 'Player@1234', description: 'Min 8 chars, 1 uppercase, 1 digit, 1 special char' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Signup successful', content: { 'application/json': { example: { message: 'Signup successful', nextStep: 'complete_profile' } } } },
            '400': { description: 'Validation error', content: { 'application/json': { example: { error: 'Password must be at least 8 characters' } } } },
            '409': { description: 'Email already registered', content: { 'application/json': { example: { error: 'Email already registered' } } } },
          },
        },
      },

      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login — admin and users use the same endpoint',
          description: 'Rate limited: 20 requests/15min per IP. Returns short-lived JWT (15min) with optional refresh token strategy for session continuity. Generic error returned for invalid email/password to prevent user enumeration.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@gamestore.com' },
                    password: { type: 'string', example: 'DevAdmin@2024!' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful — use token in Authorization: Bearer <token>',
              content: {
                'application/json': {
                  example: {
                    token: 'eyJhbGciOiJIUzI1NiJ9...',
                    type: 'Bearer',
                    user: {
                      id: 'uuid',
                      email: 'admin@gamestore.com',
                      status: 'APPROVED',
                      profileComplete: true,
                      isSuperAdmin: true,
                    },
                  },
                },
              },
            },
            '401': { description: 'Invalid credentials', content: { 'application/json': { example: { error: 'Invalid email or password' } } } },
          },
        },
      },

      '/auth/profile': {
        post: {
          tags: ['Auth'],
          summary: 'Complete user profile (after signup)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName', 'phone', 'address', 'city', 'state', 'country'],
                  properties: {
                    firstName: { type: 'string', example: 'Ravi' },
                    lastName: { type: 'string', example: 'Kumar' },
                    phone: { type: 'string', example: '9999999999' },
                    address: { type: 'string', example: '123 Main Street' },
                    city: { type: 'string', example: 'Hyderabad' },
                    state: { type: 'string', example: 'Telangana' },
                    country: { type: 'string', example: 'IN' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Profile saved', content: { 'application/json': { example: { message: 'Profile completed', nextStep: 'await_approval' } } } },
            '400': { description: 'Validation error or account already approved/rejected', content: { 'application/json': { example: { error: 'Profile can only be updated while account is pending approval' } } } },
            '401': { description: 'Missing or invalid token' },
          },
        },
      },

      '/games': {
        get: {
          tags: ['Games'],
          summary: 'List active games (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'genre', in: 'query', schema: { $ref: '#/components/schemas/Genre' } },
          ],
          responses: {
            '200': {
              description: 'Games list with live play counts',
              content: { 'application/json': { example: { games: [], total: 0, pages: 1, page: 1 } } },
            },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Account not approved, rejected, or profile incomplete' },
          },
        },
      },

      '/games/{id}': {
        get: {
          tags: ['Games'],
          summary: 'Get game detail',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'uuid-here' }],
          responses: {
            '200': { description: 'Game detail with live totalPlayCount' },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Account not approved or profile incomplete' },
            '404': { description: 'Game not found or inactive' },
          },
        },
      },

      '/games/{id}/play': {
        post: {
          tags: ['Games'],
          summary: 'Record a game play',
          description: 'Increments Redis play counter. Rate limited: 30 req/min per userId + IP. Returns 404 if game is inactive. Flush is protected using Redis distributed lock (SET NX EX 90s) — only one worker runs at a time. Inside the lock: GET counts → DB transaction → DECRBY. If transaction fails, counts remain in Redis untouched for next cycle — zero data loss.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Play recorded', content: { 'application/json': { example: { success: true } } } },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Account not approved or profile incomplete' },
            '404': { description: 'Game not found or inactive' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },

      '/admin/dashboard': {
        get: {
          tags: ['Admin'],
          summary: 'Dashboard stats',
          description: 'Returns totalUsers, pendingUsers, totalGames, topGames. Cached in Redis for 60s.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Dashboard stats',
              content: {
                'application/json': {
                  example: { totalUsers: 42, pendingUsers: 5, totalGames: 10, topGames: [] },
                },
              },
            },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
      },

      '/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'List pending users (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Max 100' },
          ],
          responses: {
            '200': {
              description: 'Pending users list',
              content: { 'application/json': { example: { users: [], total: 0, pages: 1, page: 1, limit: 10 } } },
            },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
      },

      '/admin/users/{id}/approve': {
        post: {
          tags: ['Admin'],
          summary: 'Approve a user',
          description: 'Only allowed when status === PENDING and profileComplete === true. Invalidates dashboard cache.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'User approved', content: { 'application/json': { example: { message: 'User approved' } } } },
            '404': { description: 'User not found', content: { 'application/json': { example: { error: 'User not found' } } } },
            '409': { description: 'Invalid state transition — profile incomplete or status not PENDING', content: { 'application/json': { example: { error: 'Cannot approve — user status is already APPROVED' } } } },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
      },

      '/admin/users/{id}/reject': {
        post: {
          tags: ['Admin'],
          summary: 'Reject a user',
          description: 'Only allowed when status === PENDING. Invalidates dashboard cache.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'User rejected', content: { 'application/json': { example: { message: 'User rejected' } } } },
            '404': { description: 'User not found', content: { 'application/json': { example: { error: 'User not found' } } } },
            '409': { description: 'Invalid state transition — status not PENDING', content: { 'application/json': { example: { error: 'Cannot reject — user status is already APPROVED' } } } },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
      },

      '/admin/games': {
        get: {
          tags: ['Admin'],
          summary: 'List all games (admin view)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          ],
          responses: {
            '200': { description: 'All games including inactive' },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
        post: {
          tags: ['Admin'],
          summary: 'Create a new game',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'description', 'genre', 'thumbnailUrl', 'maxPlayers'],
                  properties: {
                    name: { type: 'string', example: 'Call of Duty' },
                    description: { type: 'string', example: 'First person shooter' },
                    genre: { $ref: '#/components/schemas/Genre' },
                    thumbnailUrl: { type: 'string', example: 'https://picsum.photos/seed/cod/400/300' },
                    maxPlayers: { type: 'integer', example: 100 },
                    isActive: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Game created', content: { 'application/json': { example: { id: 'uuid', name: 'Call of Duty' } } } },
            '400': { description: 'Validation error' },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
      },

      '/admin/games/{id}': {
        put: {
          tags: ['Admin'],
          summary: 'Update a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Call of Duty Updated' },
                    description: { type: 'string' },
                    genre: { $ref: '#/components/schemas/Genre' },
                    thumbnailUrl: { type: 'string' },
                    maxPlayers: { type: 'integer' },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Game updated' },
            '400': { description: 'Validation error' },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
        delete: {
          tags: ['Admin'],
          summary: 'Deactivate a game (soft delete)',
          description: 'Sets isActive to false. Play history is preserved. Redis play buffer is cleared.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Game deactivated', content: { 'application/json': { example: { message: 'Game deactivated' } } } },
            '401': { description: 'Missing or invalid token' },
            '403': { description: 'Admin access required' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
