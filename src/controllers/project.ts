import Project from "../entities/Project";

export const projectExists = async (name: string): Promise<boolean> => {
  const project = await Project.findOne({ where: { name } });
  if (project) {
    return true;
  }
  return false;
};
