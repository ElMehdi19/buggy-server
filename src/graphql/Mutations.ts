import {
  ApolloError,
  ValidationError,
  AuthenticationError,
  PubSub,
  UserInputError,
} from "apollo-server-express";
import { In } from "typeorm";
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
import {
  comparePasswords,
  updatePassword,
  userEmailExists,
} from "../controllers/auth";
import {
  newReportEvent,
  reportEventStringified,
  getReportById,
} from "../controllers/report";
import { incrementFixerCount, projectExists } from "../controllers/project";
import { findUserById } from "../controllers/auth";
import { addNotification } from "../controllers/notifications";
import Notification from "../entities/Notification";
import { processFiles } from "../controllers/attachments";
import { any } from "../controllers/middlewares";
import { processImage } from "../controllers/profile";

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

  return { id: user.id };
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
): Promise<boolean> => {
  if (await userEmailExists(args.email))
    throw new ValidationError(
      "This email address is already associated with an account."
    );
  const password = await hash(args.password, 12);
  try {
    const user = await User.create({ ...args, password });
    await user.save();
    return true;
  } catch (e) {
    return false;
  }
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
    attachments: any;
  },
  { req, pubsub }: { req: any; pubsub: PubSub }
): Promise<boolean> => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized access");
  }
  const reporter = (await User.findOne(req.userId)) as User;
  const project = await Project.findOne(args.projectId);
  if (!project) {
    throw new UserInputError("project doesn't exist");
  }

  const { attachments } = args;
  const processAttachments = await processFiles(project.id, 1, attachments);

  if (!processAttachments) {
    throw new UserInputError(
      "Error while uploading files! Please make sure you are uploading the right file types."
    );
  }

  const reportAttachments = JSON.stringify(processAttachments);

  const initEvent = newReportEvent(reporter, { type: "INIT_REPORT" });
  const events = await reportEventStringified(initEvent);
  const newReport = Report.create({
    ...args,
    reporter,
    project,
    events,
    attachments: reportAttachments,
  });
  let report: Report;
  try {
    report = await newReport.save();
    const { reportCount } = reporter;
    await User.update({ id: reporter.id }, { reportCount: reportCount + 1 });
  } catch (e) {
    return false;
  }

  let notification: string;
  try {
    notification = await addNotification(reporter.id, {
      type: "NEW_REPORT",
      projectId: project.id,
      reportId: report.id,
    });
  } catch (e) {
    return false;
  }

  pubsub.publish("NEW_REPORT", {
    newNotification: {
      notifier: req.userId,
      report: report.id,
      notification,
    },
  });
  return true;
};

export const addProjectMutation = async (
  _: void,
  args: {
    name: string;
    departement: string | null;
    supervisor: number;
    members: number[] | null;
  }
) => {
  const exists = await projectExists(args.name);
  if (exists) {
    throw new ValidationError("Project already exists");
  }
  const { name, departement: dept, supervisor, members } = args;
  const departement = dept ? dept : "general";
  const manager = await User.findOne(supervisor);
  if (!manager) {
    throw new UserInputError("invalid user id for manager field");
  }
  let users: User[];
  if (members) {
    users = await User.find({ where: { id: In(members) } });
  } else {
    users = await User.find();
  }

  try {
    const project = await Project.create({
      name,
      departement,
      manager,
      users: users,
    });
    await project.save();
  } catch (e) {
    return false;
  }
  return true;
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

  let author: User;
  let report: Report;
  let comment: Comment;

  try {
    author = await findUserById(req.userId);
    report = reportInstance as Report;
    const commentEntity = Comment.create({ content, author, report });
    comment = await commentEntity.save();
    const notification = await addNotification(author.id, {
      type: "NEW_COMMENT",
      projectId: report.project.id,
      reportId: report.id,
    });
    pubsub.publish("NEW_COMMENT", {
      newNotification: {
        notifier: req.userId,
        report: report.id,
        notification,
      },
    });
  } catch (e) {
    return false;
  }

  const event = newReportEvent(author, { type: "NEW_COMMENT" });
  const events = await reportEventStringified(event, report.id);
  const updated = Date.now();

  try {
    await Report.update({ id: report.id }, { events, updated });
  } catch (e) {
    return false;
  }
  return true;
};

export const updateIssueStatusMutation = async (
  _: void,
  args: { reportId: number; status: REPORT_STATUS },
  { req, pubsub }: { req: any; pubsub: PubSub }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }

  const { reportId, status } = args;
  const report = await getReportById(reportId);
  if (!report) {
    throw new ApolloError("invalid report id");
  }
  const { project } = report;
  const user = (await User.findOne(req.userId)) as User;
  const event = newReportEvent(user, { type: "REPORT_STATUS_ACTION", status });
  const events = await reportEventStringified(event, reportId);
  const updated = Date.now();

  if (status === "CLOSED" && report.status !== "CLOSED") {
    try {
      await incrementFixerCount(project, user.id);
      const { fixedCount } = user;
      await User.update({ id: user.id }, { fixedCount: fixedCount + 1 });
    } catch (e) {
      return false;
    }
  }

  try {
    await Report.update({ id: reportId }, { status, events, updated });
  } catch (e) {
    return false;
  }

  const notification = await addNotification(req.userId, {
    type: "STATUS_UPDATE",
    reportId: report.id,
    projectId: project.id,
    status,
  });

  pubsub.publish("REPORT_STATUS_UPDATE", {
    newNotification: {
      notifier: req.userId,
      report: report.id,
      notification,
    },
  });

  return true;
};

export const resetNotificationMutation = async (
  _: void,
  __: void,
  { req }: { req: any }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }
  try {
    await User.update({ id: req.userId }, { notificationCount: 0 });
  } catch (e) {
    return false;
  }
  return true;
};

export const updateNotificationMutation = async (
  _: void,
  args: { id: number; by: number; report: number }
) => {
  const { id, by, report: reportId } = args;
  try {
    const notifier = (await User.findOne(by)) as User;
    const report = (await Report.findOne(reportId)) as Report;
    await Notification.update({ id }, { notifier, report });
  } catch (e) {
    return false;
  }

  return true;
};

export const assignIssueMutation = async (
  _: void,
  args: { id: number; userId: number },
  { req, pubsub }: { req: any; pubsub: PubSub }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }
  const { id, userId } = args;
  const report = await Report.findOne(id, {
    relations: ["project", "reporter"],
  });
  if (!report) {
    throw new UserInputError("invalid id for report field");
  }
  const project = (await Project.findOne(report.project.id, {
    relations: ["manager"],
  })) as Project;
  if (project.manager) {
    if (req.userId !== project.manager.id) {
      throw new AuthenticationError("unauthorized");
    }
  } else if (req.userId !== report.reporter.id) {
    throw new AuthenticationError("unauthorized");
  }
  const assignee = await User.findOne(userId);
  if (!assignee) {
    throw new UserInputError("invalid id for report field");
  }
  const user = (await User.findOne(req.userId)) as User;
  const event = newReportEvent(user, {
    type: "NEW_ASSIGNEMENT",
    assignee,
  });
  try {
    const events = await reportEventStringified(event, report.id);
    const updated = Date.now();
    await Report.update({ id }, { assignee, events, updated });
  } catch (e) {
    return null;
  }
  const notificationPayload = {
    reportId: report.id,
    projectId: project.id,
    assignee,
  };
  const notification = await addNotification(req.userId, {
    type: "NEW_ASSIGNMENT",
    ...notificationPayload,
  });

  pubsub.publish("NEW_ASSIGNMENT", {
    newNotification: {
      notifier: req.userId,
      report: report.id,
      notification,
    },
  });
  return true;
};

export const updateProfileMutation = async (
  _: void,
  args: { oldPass: string; newPass: string; newPassConf: string; image: any },
  { req }: { req: any }
) => {
  if (!req.userId) {
    throw new AuthenticationError("unauthorized");
  }
  if (!any(Object.keys(args))) {
    throw new UserInputError("nothing was submitted");
  }

  const { oldPass, newPass, newPassConf, image } = args;
  const user = (await User.findOne(req.userId)) as User;

  if (any([oldPass, newPass, newPassConf])) {
    const { password } = user;

    if (!comparePasswords(newPass, newPassConf)) {
      throw new UserInputError(
        "New password and password confirmation field don't match!"
      );
    }

    if (!(await compare(oldPass, password))) {
      throw new AuthenticationError("Wrong password!");
    }

    if (!(await updatePassword(user, newPass))) return false;
  }

  if (image) {
    const newImageName = await processImage(user, image);
    if (!newImageName) return false;
    try {
      await User.update({ id: user.id }, { image: newImageName });
    } catch (e) {
      return false;
    }
  }

  return true;
};
