import User from "../entities/User";
import Project from "../entities/Project";
import Notification from "../entities/Notification";
import Report from "../entities/Report";

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
    relations: ["report"],
    select: ["notification", "report"],
  });
  return notifications;
};

type notificationPayload = {
  type: "NEW_COMMENT" | "NEW_REPORT" | "STATUS_UPDATE";
  projectId: number;
  reportId?: number;
  status?: string;
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
  const { reportId } = context;
  const report = await Report.findOne(reportId);
  switch (type) {
    case "NEW_COMMENT":
      content = `commented on report #${reportId} about project ${projectName}`;
      break;
    case "STATUS_UPDATE":
      const { status } = context;
      content = `marked report #${reportId} on project ${projectName} as ${status}`;
      break;
    default:
      content = `reported an issue on project ${projectName}`;
      break;
  }
  const notificationContent = `${firstName} ${lastName} ${content}`;
  const notification = await Notification.create({
    notification: notificationContent,
    project,
    report,
    notifier: user,
  });

  await notification.save();
  const users = await User.find();

  for (const user of users) {
    if (user.id === userId) continue;
    const { notificationCount } = user;
    const count = notificationCount + 1;
    await User.update({ id: user.id }, { notificationCount: count });
  }

  return notification.notification;
};
