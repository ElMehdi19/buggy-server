import User from "../entities/User";
import Project from "../entities/Project";
import Notification from "../entities/Notification";

export const getNotifications = async (
  projectId: number = 0
): Promise<Notification[]> => {
  // let notifications: Notification[] = [];
  // if (projectId == 0) {
  //   const projects = await Project.find();
  //   for (const project of projects) {
  //     notifications = [...project.notifications];
  //   }
  //   return notifications;
  // }
  // const project = (await Project.findOne(projectId)) as Project;
  // return project.notifications;
  const notifications = await Notification.find({
    order: { id: "DESC" },
    select: ["notification"],
  });
  return notifications;
};

type notificationPayload = {
  type: "NEW_COMMENT" | "NEW_REPORT";
  projectId: number;
  reportId?: number;
};

export const addNotification = async (
  userId: number,
  context: notificationPayload
): Promise<string> => {
  const { type, projectId } = context;
  const project = (await Project.findOne(projectId)) as Project;
  const { name: projectName } = project;
  const user = (await User.findOne(userId)) as User;
  const { firstName, lastName } = user;
  let content: string;
  switch (type) {
    case "NEW_COMMENT":
      const { reportId } = context;
      content = `commented on report #${reportId} about project ${projectName}`;
      break;
    default:
      content = `reported an issue on project ${projectName}`;
      break;
  }
  const notificationContent = `${firstName} ${lastName} ${content}`;
  const notification = await Notification.create({
    notification: notificationContent,
    project,
  });

  await notification.save();
  const users = await User.find();

  for (const user of users) {
    const { notificationCount } = user;
    const count = notificationCount + 1;
    await User.update({ id: user.id }, { notificationCount: count });
  }

  return notification.notification;
};
