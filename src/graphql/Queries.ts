import Report from "../entities/Report";
import User from "../entities/User";
import Project from "../entities/Project";
import Comment from "../entities/Comment";

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
  console.log(req.userId);
  if (!req.userId) return null;
  return await User.findOne(req.userId);
};
