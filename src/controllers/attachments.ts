import { createWriteStream, ReadStream } from "fs";

const allowedFileTypes = ["png", "jpg", "gif", "webp", "jpeg", "txt", "log"];
const allowedMimeTypes = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
];

export const fileExtension = (filename: string): string => {
  const file_parts = filename.split(".");
  const extension = file_parts[file_parts.length - 1];
  return extension;
};

export const verifyFileType = (filename: string): boolean => {
  if (!filename.includes(".")) return true;
  const extension = fileExtension(filename);
  return allowedFileTypes.includes(extension);
};

export const verifyMimeType = (mimetype: string): boolean => {
  return allowedMimeTypes.includes(mimetype);
};

export type File = {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => ReadStream;
};

type FileStream = {
  project: number;
  report: number;
  filename: string;
  stream: ReadStream;
};

export const storeFile = async (file: FileStream): Promise<string> => {
  const { filename, stream, project, report } = file;
  const fileID = Math.floor(Math.random() * 10000);
  const extension = fileExtension(filename);
  const attachmentName = `PR${project}-RP${report}-${fileID}.${extension}`;
  const path = `attachments/${attachmentName}`;

  return new Promise((resolve, reject) =>
    stream
      .pipe(createWriteStream(path))
      .on("finish", () => resolve(attachmentName))
      .on("error", reject)
  );
};

export const processFiles = async (
  project: number,
  report: number,
  attachments: any
): Promise<false | string[]> => {
  const files: File[] = await Promise.all(
    attachments.map((file: any) => file.originFileObj)
  );

  for (const { filename, mimetype } of files) {
    if (!verifyFileType(filename) || !verifyMimeType(mimetype)) {
      return false;
    }
  }

  const streams = await Promise.all(
    files.map(({ filename, createReadStream }) => ({
      project,
      report,
      filename,
      stream: createReadStream(),
    }))
  );

  try {
    const uploads = await Promise.all(
      streams.map((stream) => storeFile(stream))
    );
    return uploads;
  } catch (e) {
    return false;
  }
};
