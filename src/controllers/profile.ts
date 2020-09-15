import { join } from "path";
import { Stream } from "stream";
import { createWriteStream, unlink, unlinkSync } from "fs";
import User from "../entities/User";
import { File, fileExtension } from "./attachments";
const allowedImageTypes = ["png", "jpg", "jpeg"];
const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];

export const verifyType = (filename: string): boolean => {
  const file_parts = filename.split(".");
  const extension = file_parts[file_parts.length - 1];
  return allowedImageTypes.includes(extension);
};

interface FileStream {
  userId: number;
  filename: string;
  stream: Stream;
}

export const storeImage = (file: FileStream): Promise<string> => {
  const { userId, filename, stream } = file;
  const fileID = Math.floor(Math.random() * 10000);
  const extension = fileExtension(filename);
  const fileName = `ppic_${userId}_${fileID}.${extension}`;
  const path = `profile_pics/${fileName}`;

  return new Promise((resolve, reject) =>
    stream
      .pipe(createWriteStream(path))
      .on("finish", () => resolve(fileName))
      .on("error", reject)
  );
};

export const verifyMime = (mimetype: string): boolean =>
  allowedMimeTypes.includes(mimetype);

export const deleteOldPic = (filename: string): boolean => {
  if (filename.startsWith("default")) return true;
  try {
    unlinkSync(join(__dirname, "../../profile_pics", filename));
    return true;
  } catch (e) {
    return false;
  }
};

export const processImage = async (
  user: User,
  image: any
): Promise<false | string> => {
  const file: File = await image;
  if (!verifyType(file.filename) || !verifyMime(file.mimetype)) return false;

  const stream: Stream = file.createReadStream();
  try {
    const filename = await storeImage({
      userId: user.id,
      filename: file.filename,
      stream,
    });
    deleteOldPic(user.image);
    return filename;
  } catch (e) {
    return false;
  }
};
