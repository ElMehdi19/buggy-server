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
  notificationCountQuery,
  notificationsQuery,
} from "./Queries";

import {
  loginMutation,
  logoutMutation,
  addUserMutation,
  addReportMutation,
  addProjectMutation,
  addCommentMutation,
  updateIssueStatusMutation,
  resetNotificationMutation,
} from "./Mutations";
import {
  newReportSubscription,
  newCommentSubscription,
  newNotificationSubscription,
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
    notificationCount: notificationCountQuery,
    notifications: notificationsQuery,
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
    resetNotificationCount: resetNotificationMutation,
  },
  Subscription: {
    newComment: {
      subscribe: newCommentSubscription,
    },
    newReport: {
      subscribe: newReportSubscription,
    },
    newNotification: {
      subscribe: newNotificationSubscription,
    },
  },
};

export default resolvers;
