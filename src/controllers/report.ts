import Report from "../entities/Report";

export const reportExistsById = async (
  id: number
): Promise<Report | boolean> => {
  console.log(typeof id);
  const report = await Report.findOne(id);
  console.log(report!.id === id);
  if (!report || report.id !== id) return false;
  return report;
};
