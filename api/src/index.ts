/**
 * API entry point — wires together Apollo GraphQL, Express REST, and WebSocket subscriptions.
 */

import 'dotenv/config';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { restRouter } from './rest/router';
import { authMiddleware } from './middleware/auth';
import { metricsHandler, requestMetricsMiddleware } from './middleware/metrics';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestMetricsMiddleware);

  // Health + metrics
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/metrics', metricsHandler);

  // Build executable schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket for GraphQL subscriptions
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const apiKey = ctx.connectionParams?.['x-api-key'] as string | undefined;
        return { apiKey, redis };
      },
    },
    wsServer,
  );

  // Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    authMiddleware,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: (req as any).user,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apiKey: (req as any).apiKey,
        prisma,
        redis,
      }),
    }) as unknown as Parameters<typeof app.use>[1],
  );

  // REST endpoints (also behind auth)
  app.use('/v1', authMiddleware, restRouter);

  await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));
  logger.info(`🚀  API server ready at http://localhost:${PORT}/graphql`);
}

main().catch((err) => {
  logger.error(err, 'Fatal error starting API server');
  process.exit(1);
});
