import { readdirSync, createWriteStream, ReadStream } from "fs";

export const fileQuery = () => {
  const files = readdirSync("./images");
  return files.length;
};

const storeUpload = async (stream: ReadStream, filename: string) => {
  const id = Math.floor(Math.random() * 1000);
  const file_parts = filename.split(".");
  const extension = file_parts[file_parts.length - 1];
  const path = `attachments/${id}.${extension}`;
  return new Promise((resolve, reject) => {
    stream
      .pipe(createWriteStream(path))
      .on("finish", () => {
        console.log("file id: ", id);
        resolve({ id });
      })
      .on("error", reject);
  });
};

type File = {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => ReadStream;
};
export const fileMutation = async (_: void, { attachments }: any) => {
  const allowedMimes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/gif",
    "text/plain",
  ];
  const allowedTypes = ["png", "jpg", "jpeg", "gif", "txt", "log"];
  const verifyType = (filename: string) => {
    if (!filename.includes(".")) return true;
    const file_parts = filename.split(".");
    const extension = file_parts[file_parts.length - 1];
    if (allowedTypes.includes(extension)) return true;
    return false;
  };
  const verifyMime = (mimetype: string) =>
    allowedMimes.includes(mimetype) ? true : false;
  const files: File[] = await Promise.all(
    attachments.map((f: any) => f.originFileObj)
  );

  for (const { filename, mimetype } of files) {
    if (!verifyType(filename) || !verifyMime(mimetype)) {
      console.log(filename, verifyType(filename));
      console.log(mimetype, verifyMime(mimetype));
      return false;
    }
  }
  const streams = await Promise.all(
    files.map(({ createReadStream, filename }) => ({
      stream: createReadStream(),
      filename,
    }))
  );
  const uploads = streams.map(({ stream, filename }) =>
    storeUpload(stream, filename)
  );
  const uploadP = await Promise.all(uploads);
  console.log(uploadP);
  return true;
};
