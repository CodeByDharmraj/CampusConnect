import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred.";
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (
    err.type === "entity.parse.failed" ||
    (err.status === 400 && err instanceof SyntaxError)
  ) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body contains invalid JSON.";
  } else if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    message = "A resource with these values already exists.";
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Data validation failed.";
    details = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "INVALID_RESOURCE_ID";
    message = "A supplied resource ID is invalid.";
  }

  if (statusCode >= 500) {
    console.error("Unhandled API error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
