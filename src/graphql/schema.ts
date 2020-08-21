import "graphql-import-node";
import typeDefs from "./schema.graphql";
import resolvers from "./resolverMap";
import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "graphql-tools";

const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false,
  },
});

export default schema;
