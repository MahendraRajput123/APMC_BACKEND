import { request, response, NextFunction, Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

interface ReqWithVersion extends Request {
  apiVersion?: string;
}

const checkVersion = expressAsyncHandler(
  async (req: ReqWithVersion, res: Response, next: NextFunction) => {
    const version = (req.headers["version"] as string) || "100";
    req.apiVersion = version;
    next();
  }
);

export { checkVersion };