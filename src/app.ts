import express from "express";
import { createServer } from "http";
import { ApolloServer } from "apollo-server-express";
import { createConnection } from "typeorm";

import schema from "./graphql/schema";
import { mehdi, cookieParser } from "./controllers/middlewares";
import { verifyTokens } from "./controllers/auth";

// init express and apollo-server
const app = express();
const server = createServer(app);
const apolloServer = new ApolloServer({
  schema,
  playground: true,
  context: ({ req, res }) => ({ req, res }),
});

// middlewares
app.use(cookieParser);
app.use(verifyTokens);
app.use(mehdi);

apolloServer.applyMiddleware({
  app,
  cors: {
    credentials: true,
    origin: "http://localhost:3000",
  },
});

// listening for requests

const startServer = async () => {
  const connection = await createConnection();
  await connection.query("PRAGMA foreign_keys=OFF;");
  await connection.synchronize();
  await connection.query("PRAGMA foreign_keys=ON;");

  console.log("💯🔥 connected to sqlite");
  server.listen(4000, () =>
    console.log(
      `🚀 we are live on http://127.0.0.1:4000${apolloServer.graphqlPath}`
    )
  );
};

startServer();
