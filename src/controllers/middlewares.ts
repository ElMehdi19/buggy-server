import { Request, Response, NextFunction } from "express";

export const mehdi = (req: Request, _: Response, next: NextFunction) => {
  const message = `${req.method} ${req.path}`;
  console.log(message);
  next();
};

export const cookieParser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let cookies: { [key: string]: string } = {};
  const cookieHeader = req.headers.cookie?.split(";");
  cookieHeader?.forEach((cookieKeyVal) => {
    let key: string;
    let value: string;
    [key, value] = cookieKeyVal.split("=");
    cookies = { ...cookies, [key]: value };
  });
  req.cookies = cookies;
  next();
};

export const any = (array: any[]): boolean => {
  for (const item of array) {
    if (item) return true;
  }

  return false;
};
