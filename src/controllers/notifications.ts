import User from "../entities/User";
import Project from "../entities/Project";

const getNotifications = async (projectId: number): Promise<string[]> => {
  const { notifications } = (await Project.findOne(projectId)) as Project;
  return JSON.parse(notifications);
};

export const addNotification = async (
  userId: number,
  context: { type: string; projectId: number }
) => {
  const { type, projectId } = context;
  const { name: project } = (await Project.findOne(projectId)) as Project;
  const user = (await User.findOne(userId)) as User;
  const { firstName, lastName } = user;
  let content: string;
  switch (type) {
    case "COMMENT":
      content = `commented on a report about project ${project}`;
      break;
    default:
      content = `reported an issue on project ${project}`;
      break;
  }
  const notificationString = `${firstName} ${lastName} ${content}`;
  const notifications = await getNotifications(userId);
  const updatedNotifications = [...notifications, notificationString];
  // await Project.update({id: projectId}, { notifications: JSON.stringify(updatedNotifications) });
  return updatedNotifications;
};
