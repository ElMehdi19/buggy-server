import { IResolvers } from "graphql-tools";
import { hash, compare } from "bcryptjs";
import {
  ValidationError,
  AuthenticationError,
  ApolloError,
  PubSub,
} from "apollo-server-express";
import { sign } from "jsonwebtoken";

import User from "../entities/User";
import Report from "../entities/Report";
import Project from "../entities/Project";
import { userEmailExists, findUserById } from "../controllers/auth";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../constants";
import { projectExists } from "../controllers/project";
import { reportExistsById } from "../controllers/report";
import Comment from "../entities/Comment";
import { Request } from "express";

const resolvers: IResolvers = {
  User: {
    reports: async (parent: User) => {
      return await Report.find({ where: { reporter: parent } });
    },
  },
  Report: {
    reporter: async (parent: Report & { reporter: User }) => {
      return await User.findOne(parent.reporter.id);
    },
    project: async (parent: Report & { project: Project }) => {
      return await Project.findOne(parent.project.id);
    },
    comments: async (parent: Report) => {
      return Comment.find({ where: { report: parent }, relations: ["author"] });
    },
  },
  Project: {
    reports: async (parent: Project) => {
      return await Report.find({
        where: { project: parent },
        relations: ["reporter", "comments"],
      });
    },
  },
  Comment: {
    author: async (parent: Comment) => {
      return await User.findOne(parent.author.id);
    },
    report: async (parent: Comment) => {
      return await Report.findOne(parent.report.id);
    },
  },
  Query: {
    user: async (_: void, args: { id: number }) => {
      return await User.findOne(args.id);
    },
    users: async () => {
      return await User.find({ relations: ["reports"] });
    },
    report: async (_: void, args: { id: number }) => {
      const report = await Report.findOne(args.id, {
        relations: ["reporter", "comments", "project"],
      });
      if (!report) {
        return null;
      }
      let { reproduceSteps } = report;
      const steps = JSON.parse(reproduceSteps);
      return { ...report, reproduceSteps: steps };
    },
    reports: async () => {
      return await Report.find({
        relations: ["reporter", "project"],
        order: { updated: "DESC", id: "DESC" },
      });
    },
    project: async (_: void, args: { id: number }) => {
      return await Project.findOne(args.id);
    },
    projects: async () => {
      return await Project.find({ relations: ["reports"] });
    },
    comment: async (_: void, args: { id: number }) => {
      return await Comment.findOne(args.id, {
        relations: ["author", "report"],
      });
    },
    comments: async (_: void, args: { reportId: number }) => {
      const report = await Report.findOne(args.reportId);
      if (!report) return null;
      return await Comment.find({
        where: { report },
        relations: ["author", "report"],
      });
    },
    whoami: async (_: void, __: void, { req }) => {
      console.log(req.userId);
      if (!req.userId) return null;
      return await User.findOne(req.userId);
    },
  },
  Mutation: {
    login: async (
      _: void,
      args: { email: string; password: string },
      { res }
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
        expiresIn: "15s",
      });
      const refreshToken = sign({ userId: user.id }, REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      res.cookie("accessToken", accessToken, { maxAge: 15 * 1000 });
      res.cookie("refreshToken", refreshToken, {
        maxAge: 7 * 24 * 3600 * 1000,
      });

      return user;
    },
    logout: (_: void, __: void, { req, res }) => {
      if (!req.userId) return false;
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return true;
    },
    addUser: async (
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
    },
    addReport: async (
      _: void,
      args: {
        bug: string;
        details: string;
        created: string;
        severity: "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";
        reproduceSteps: string;
        projectId: number;
      },
      { req }
    ): Promise<Report | null> => {
      if (!req.userId) {
        throw new AuthenticationError("unauthorized access");
      }
      const reporter = await User.findOne(req.userId);
      const project = await Project.findOne(args.projectId);
      const report = Report.create({ ...args, reporter, project });
      return await report.save();
    },
    addProject: async (
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
    },
    addComment: async (
      _: void,
      args: { reportId: number; content: string },
      { req, pubsub }: { req: any; pubsub: PubSub }
    ) => {
      if (!req.userId) {
        throw new AuthenticationError("unauthorized access");
      }
      const { reportId, content } = args;
      const reportInstance = await reportExistsById(reportId);
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
      return comment;
    },
    updateReport: async (_: void, args: { id: number; steps: string }) => {
      Report.update({ id: args.id }, { reproduceSteps: args.steps });
      const report = await Report.findOne(args.id);
      if (!report) return null;
      console.log(JSON.parse(report.reproduceSteps));
      return report;
    },
  },
  Subscription: {
    newComment: {
      subscribe: (_: void, __: void, { pubsub }: { pubsub: PubSub }) =>
        pubsub.asyncIterator("NEW_COMMENT"),
    },
  },
};

export default resolvers;
