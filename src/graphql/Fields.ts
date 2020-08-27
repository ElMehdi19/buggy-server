import Report from "../entities/Report";
import User from "../entities/User";
import Project from "../entities/Project";
import Comment from "../entities/Comment";

export const userField = {
  reports: async (parent: User) => {
    return await Report.find({ where: { reporter: parent } });
  },
};

export const reportField = {
  reporter: async (parent: Report & { reporter: User }) => {
    return await User.findOne(parent.reporter.id);
  },
  project: async (parent: Report & { project: Project }) => {
    return await Project.findOne(parent.project.id);
  },
  comments: async (parent: Report) => {
    return Comment.find({
      where: { report: parent },
      relations: ["author"],
      order: { id: "DESC" },
    });
  },
};

export const projectField = {
  reports: async (parent: Project) => {
    return await Report.find({
      where: { project: parent },
      relations: ["reporter", "comments"],
    });
  },
};

export const commentField = {
  author: async (parent: Comment) => {
    return await User.findOne(parent.author.id);
  },
  report: async (parent: Comment) => {
    return await Report.findOne(parent.report.id);
  },
};
