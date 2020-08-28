import {
  ApolloError,
  ValidationError,
  AuthenticationError,
  PubSub,
  UserInputError,
} from "apollo-server-express";
import { Response } from "express";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import Report from "../entities/Report";
import User from "../entities/User";
import Project from "../entities/Project";
import Comment from "../entities/Comment";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  REPORT_STATUS,
} from "../constants";
import { userEmailExists } from "../controllers/auth";
import {
  newReportEvent,
  reportEventStringified,
  getReportById,
} from "../controllers/report";
import { projectExists } from "../controllers/project";
import { findUserById } from "../controllers/auth";

export const loginMutation = async (
  _: void,
  args: { email: string; password: string },
  { res }: { res: Response }
) => {
  const { email, password } = args;
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ValidationError("Login attempt failed");
  }

  const verifyPassword = await compare(password, user.password);
  if (!verifyPassword) {
    throw new ValidationError("Login attempt failed");
  }

  const accessToken = sign({ userId: user.id }, ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = sign({ userId: user.id }, REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("accessToken", accessToken, { maxAge: 3600 * 1000 });
  res.cookie("refreshToken", refreshToken, {
    maxAge: 7 * 24 * 3600 * 1000,
  });

  return user;
};

export const logoutMutation = (
  _: void,
  __: void,
  { req, res }: { req: any; res: Response }
) => {
  if (!req.userId) return false;
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return true;
};

export const addUserMutation = async (
  _: void,
  args: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }
): Promise<User> => {
  if (await userEmailExists(args.email))
    throw new ValidationError(
      "This email address is already associated with an account."
    );
  const password = await hash(args.password, 12);
  const user = await User.create({ ...args, password });
  return await user.save();
};

export const addReportMutation = async (
  _: void,
  args: {
    bug: string;
    details: string;
    created: string;
    severity: "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";
    reproduceSteps: string;
    projectId: number;
  },
  { req, pubsub }: { req: any; pubsub: PubSub }
): Promise<Report | null> => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized access");
  }
  const reporter = (await User.findOne(req.userId)) as User;
  const project = await Project.findOne(args.projectId);
  if (!project) {
    throw new UserInputError("project doesn't exist");
  }
  const initEvent = newReportEvent(reporter, { type: "INIT_REPORT" });
  const events = await reportEventStringified(initEvent);
  const report = Report.create({ ...args, reporter, project, events });
  pubsub.publish("NEW_REPORT", {
    newReport: {
      author: {
        name: `${reporter.firstName} ${reporter.lastName}`,
        image: reporter.image,
      },
      project: `${project.name}`,
    },
  });
  return await report.save();
};

export const addProjectMutation = async (
  _: void,
  args: { name: string; departement: string }
) => {
  const exists = await projectExists(args.name);
  if (exists) {
    throw new ValidationError("Project already exists");
  }
  const { name, departement: dept } = args;
  const departement = dept ? dept : "general";
  const project = await Project.create({ name, departement });
  return await project.save();
};

export const addCommentMutation = async (
  _: void,
  args: { reportId: number; content: string },
  { req, pubsub }: { req: any; pubsub: PubSub }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized access");
  }
  const { reportId, content } = args;
  const reportInstance = await getReportById(reportId);
  if (!reportInstance) {
    throw new ApolloError("Report not found");
  }

  const author = await findUserById(req.userId);
  const report = reportInstance as Report;
  const commentEntity = Comment.create({ content, author, report });
  const comment = await commentEntity.save();
  pubsub.publish("NEW_COMMENT", {
    newComment: {
      id: comment.id,
      content,
      author,
      report,
      posted: comment.posted,
    },
  });
  const event = newReportEvent(author, { type: "NEW_COMMENT" });
  const events = await reportEventStringified(event, report.id);
  await Report.update({ id: report.id }, { events });
  return comment;
};

export const updateIssueStatusMutation = async (
  _: void,
  args: { reportId: number; status: REPORT_STATUS },
  { req }: { req: any }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }

  const { reportId, status } = args;
  const report = await getReportById(reportId);
  if (!report) {
    throw new ApolloError("invalid report id");
  }
  const user = (await User.findOne(req.userId)) as User;
  const event = newReportEvent(user, { type: "REPORT_STATUS_ACTION", status });
  const events = await reportEventStringified(event, reportId);

  await Report.update({ id: reportId }, { status, events });
  return true;
};

export const temporaryMutation = async (
  _: void,
  __: void,
  { req, pubsub }: { req: any; pubsub: PubSub }
) => {
  if (!req.userId) return null;
  const user = (await User.findOne(req.userId)) as User;
  const { notificationCount: count } = user;
  await User.update({ id: user.id }, { notificationCount: count + 1 });
  pubsub.publish("TEMPORARY", {
    temporary: { notifications: { count: count + 1 } },
  });
  return true;
};
