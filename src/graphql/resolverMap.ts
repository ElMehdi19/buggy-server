import { IResolvers } from "graphql-tools";
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
  temporaryMutation,
} from "./Mutations";
import {
  newReportSubscription,
  newCommentSubscription,
  temporarySubscription,
} from "./Subscriptions";

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
    temporary: temporaryMutation,
  },
  Subscription: {
    newComment: {
      subscribe: newCommentSubscription,
    },
    newReport: {
      subscribe: newReportSubscription,
    },
    temporary: {
      subscribe: temporarySubscription,
    },
  },
};

export default resolvers;
