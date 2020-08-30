import Report from "../entities/Report";
import User from "../entities/User";
import Project from "../entities/Project";
import Comment from "../entities/Comment";
import { AuthenticationError } from "apollo-server-express";
import { getNotifications } from "../controllers/notifications";

export const userQuery = async (_: void, args: { id: number }) => {
  return await User.findOne(args.id);
};

export const usersQuery = async () => {
  return await User.find({ relations: ["reports"] });
};

export const reportQuery = async (_: void, args: { id: number }) => {
  const report = await Report.findOne(args.id, {
    relations: ["reporter", "comments", "project"],
  });
  if (!report) {
    return null;
  }
  let { reproduceSteps } = report;
  const steps = JSON.parse(reproduceSteps);
  return { ...report, reproduceSteps: steps };
};

export const reportsQuery = async () => {
  return await Report.find({
    relations: ["reporter", "project"],
    order: { updated: "DESC", id: "DESC" },
  });
};

export const projectQuery = async (_: void, args: { id: number }) => {
  // const project = await Project.findOne(args.id, {
  //   relations: ["notifications"],
  // });
  return await Project.findOne(args.id);
};

export const projectsQuery = async () => {
  return await Project.find({ relations: ["reports"] });
};

export const commentQuery = async (_: void, args: { id: number }) => {
  return await Comment.findOne(args.id, {
    relations: ["author", "report"],
  });
};

export const commentsQuery = async (_: void, args: { reportId: number }) => {
  const report = await Report.findOne(args.reportId);
  if (!report) return null;
  return await Comment.find({
    where: { report },
    relations: ["author", "report"],
    order: { id: "DESC" },
  });
};

export const whoami = async (_: void, __: void, { req }: { req: any }) => {
  if (!req.userId) return null;
  return await User.findOne(req.userId);
};

export const notificationCountQuery = async (
  _: void,
  __: void,
  { req }: { req: any }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }
  const { notificationCount } = (await User.findOne(req.userId)) as User;
  return notificationCount;
};

export const notificationsQuery = async (
  _: void,
  __: void,
  { req }: { req: any }
): Promise<{ count: number; notifications: string[] }> => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }
  const { notificationCount: count } = (await User.findOne(req.userId)) as User;
  const notices = await getNotifications();
  const notifications: string[] = [];
  for (const notice of notices) {
    const { notification } = notice;
    notifications.push(notification);
  }
  return { count, notifications };
};
