import User from "../entities/User";
import Project from "../entities/Project";

export const getNotifications = async (
  projectId: number = 0
): Promise<string[]> => {
  // for development only
  // to be removed after updating User entity to support current user's projects
  if (projectId == 0) {
    const notices: string[] = [];
    for (const project of await Project.find()) {
      const { notifications } = project;
      if (!notifications) {
        continue;
      }
      notices.push(
        ...JSON.parse(notifications)
          .reverse()
          .filter((notif: string) => notif.length > 0)
      );
    }
    return notices;
  }
  ///////////////////////////////////////////////////////////////
  const { notifications } = (await Project.findOne(projectId)) as Project;
  if (!notifications) return [""];
  return JSON.parse(notifications);
};

type notificationPayload = {
  type: "NEW_COMMENT" | "NEW_REPORT";
  projectId: number;
  reportId?: number;
};

export const addNotification = async (
  userId: number,
  context: notificationPayload
) => {
  const { type, projectId } = context;
  const { name: project } = (await Project.findOne(projectId)) as Project;
  const user = (await User.findOne(userId)) as User;
  const { firstName, lastName } = user;
  let content: string;
  switch (type) {
    case "NEW_COMMENT":
      const { reportId } = context;
      content = `commented on report #${reportId} about project ${project}`;
      break;
    default:
      content = `reported an issue on project ${project}`;
      break;
  }
  const notificationString = `${firstName} ${lastName} ${content}`;
  const notifications = await getNotifications(projectId);
  const updatedNotifications = [...notifications, notificationString];
  await Project.update(
    { id: projectId },
    { notifications: JSON.stringify(updatedNotifications) }
  );
  const users = await User.find();

  for (const user of users) {
    const { notificationCount } = user;
    const count = notificationCount + 1;
    await User.update({ id: user.id }, { notificationCount: count });
  }

  return notificationString;
};
