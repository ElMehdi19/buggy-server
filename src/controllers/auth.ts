import { sign, verify } from "jsonwebtoken";
import { Response, NextFunction } from "express";

import User from "../entities/User";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../constants";

export const userEmailExists = async (email: string): Promise<boolean> => {
  const user = await User.findOne({ email });
  return user ? true : false;
};

export const findUserById = async (id: number): Promise<User> => {
  const user = (await User.findOne(id)) as User;
  return user;
};

export const genTokens = (
  user: User
): { accessToken: string; refreshToken: string } => {
  const accessToken = sign({ userId: user.id }, ACCESS_TOKEN_SECRET);
  const refreshToken = sign({ userId: user.id }, REFRESH_TOKEN_SECRET);

  return { accessToken, refreshToken };
};

export const verifyTokens = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken && !refreshToken) return next();
  try {
    const accessTokenData = verify(accessToken, ACCESS_TOKEN_SECRET) as any;
    const { userId } = accessTokenData;
    req.userId = userId;
    return next();
  } catch {}

  if (!refreshToken) return next();

  let refreshTokenData;
  try {
    refreshTokenData = verify(refreshToken, REFRESH_TOKEN_SECRET) as any;
  } catch {
    return next();
  }

  if (!refreshTokenData.userId) return next();

  const user = await User.findOne(refreshTokenData.userId);
  if (!user) return next();
  const tokens = genTokens(user);

  res.cookie("accessToken", tokens.accessToken, { maxAge: 60 * 60 * 1000 });
  res.cookie("refreshToken", tokens.refreshToken, {
    maxAge: 60 * 60 * 1000 * 24 * 7,
  });
  req.userId = user.id;
  next();
};
