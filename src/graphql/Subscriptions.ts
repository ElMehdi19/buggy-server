import { PubSub, withFilter } from "apollo-server-express";
import Report from "../entities/Report";
import User from "../entities/User";

export const newReportSubscription = (
  _: void,
  __: void,
  { pubsub }: { pubsub: PubSub }
) => pubsub.asyncIterator("NEW_REPORT");

type newCommentPayload = {
  id: number;
  content: string;
  author: User;
  report: Report;
  posted: string;
};

export const newCommentSubscription = withFilter(
  (_: void, __: void, { pubsub }: { pubsub: PubSub }) =>
    pubsub.asyncIterator("NEW_COMMENT"),
  (
    payload: { newComment: newCommentPayload },
    variables: { reportId: number }
  ) => {
    return payload.newComment.report.id === variables.reportId;
  }
);

export const newNotificationSubscription = (
  _: void,
  __: void,
  { pubsub }: { pubsub: PubSub }
) =>
  pubsub.asyncIterator(["NEW_COMMENT", "NEW_REPORT", "REPORT_STATUS_UPDATE"]);
