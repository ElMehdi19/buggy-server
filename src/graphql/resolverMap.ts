import { IResolvers } from "graphql-tools";
import { PubSub, withFilter } from "apollo-server-express";
import { userField, reportField, projectField, commentField } from "./Fields";
import {
  userQuery,
  usersQuery,
  reportQuery,
  reportsQuery,
  projectQuery,
  projectsQuery,
  commentQuery,
  commentsQuery,
  whoami,
} from "./Queries";

import {
  loginMutation,
  logoutMutation,
  addUserMutation,
  addReportMutation,
  addProjectMutation,
  addCommentMutation,
  updateIssueStatusMutation,
} from "./Mutations";

const resolvers: IResolvers = {
  User: userField,
  Report: reportField,
  Project: projectField,
  Comment: commentField,
  Query: {
    user: userQuery,
    users: usersQuery,
    report: reportQuery,
    reports: reportsQuery,
    project: projectQuery,
    projects: projectsQuery,
    comment: commentQuery,
    comments: commentsQuery,
    whoami,
  },
  Mutation: {
    login: loginMutation,
    logout: logoutMutation,
    addUser: addUserMutation,
    addReport: addReportMutation,
    addProject: addProjectMutation,
    addComment: addCommentMutation,
    updateIssueStatus: updateIssueStatusMutation,
  },
  Subscription: {
    newComment: {
      subscribe: withFilter(
        (_, __, { pubsub }: { pubsub: PubSub }) =>
          pubsub.asyncIterator("NEW_COMMENT"),
        (payload, variables) => {
          return payload.newComment.report.id === variables.reportId;
        }
      ),
    },
  },
};

export default resolvers;
