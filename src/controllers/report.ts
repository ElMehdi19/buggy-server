import Report from "../entities/Report";
import User from "../entities/User";

export const getReportById = async (id: number): Promise<Report | boolean> => {
  const report = await Report.findOne(id, {
    relations: ["reporter", "project"],
  });
  console.log(report!.id === id);
  if (!report || report.id !== id) return false;
  return report;
};

type REPORT_EVENT_ACTIONS =
  | {
      type: "INIT_REPORT" | "NEW_COMMENT";
    }
  | {
      type: "REPORT_STATUS_ACTION";
      status: string;
    };

type REPORT_EVENT_OBJECT = {
  user: string;
  date: string;
  description: string;
};

export const newReportEvent = (
  user: User,
  action: REPORT_EVENT_ACTIONS
): REPORT_EVENT_OBJECT => {
  const { firstName, lastName } = user;
  let eventObject = {
    user: `${firstName} ${lastName}`,
    date: String(Date.now()),
    description: "",
  };
  switch (action.type) {
    case "INIT_REPORT":
      eventObject = {
        ...eventObject,
        description: "reported this issue",
      };
      break;
    case "NEW_COMMENT":
      eventObject = {
        ...eventObject,
        description: "added a comment",
      };
      break;
    case "REPORT_STATUS_ACTION":
      eventObject = {
        ...eventObject,
        description: `marked the issue as ${action.status}`,
      };
      break;
  }
  return eventObject;
};

export const reportEventStringified = async (
  event: REPORT_EVENT_OBJECT,
  reportId: null | number = null
): Promise<string> => {
  if (!reportId) return JSON.stringify([event]) as string;
  const report = (await getReportById(reportId)) as Report;
  const events = JSON.parse(report.events) as REPORT_EVENT_OBJECT[];
  return JSON.stringify([...events, event]);
};
