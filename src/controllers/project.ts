import Project from "../entities/Project";

export const projectExists = async (name: string): Promise<boolean> => {
  const project = await Project.findOne({ where: { name } });
  if (project) {
    return true;
  }
  return false;
};

type issueFixer = {
  userId: number;
  count: number;
};

export const issueFixersByProject = async (
  project: Project
): Promise<issueFixer[]> => {
  const { fixers } = project;
  return JSON.parse(fixers);
};

export const incrementFixerCount = async (project: Project, user: number) => {
  const issueFixers = await issueFixersByProject(project);
  let fixers: issueFixer[];
  if (issueFixers.find((fixer) => fixer.userId === user)) {
    fixers = issueFixers.map(({ userId, count }) => {
      if (userId === user) return { userId, count: count + 1 };
      return { userId, count };
    });
  } else {
    fixers = [...issueFixers, { userId: user, count: 1 }];
  }
  await Project.update({ id: project.id }, { fixers: JSON.stringify(fixers) });
};
