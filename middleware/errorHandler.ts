import { NextFunction, Request, Response } from "express";
import { Constants } from "../constants";

const ErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = res.statusCode ? res.statusCode : 500;
  switch (statusCode) {
    case Constants.VALIDATION_ERROR:
      res.json({
        title: "Validation Failed",
        message: err.message,
        stackTrace: err.stack,
      });
      break;
    case Constants.NOT_FOUND:
      res.json({
        title: "NOT_FOUND",
        message: err.message,
        stackTrace: err.stack,
      });
      break;
    case Constants.FORBIDDEN:
      res.json({
        title: "FORBIDDEN",
        message: err.message,
        stackTrace: err.stack,
      });
      break;
    case Constants.SERVER_ERROR:
      res.json({
        title: "SERVER_ERROR",
        message: err.message,
        stackTrace: err.stack,
      });
      break;
    case Constants.UNAUTHORIZED:
      res.json({
        title: "UNAUTHORIZED",
        message: err.message,
        stackTrace: err.stack,
      });
      break;
    default:
      console.log(`No Error, All good!`);
      break;
  }
};

export default ErrorHandler;
