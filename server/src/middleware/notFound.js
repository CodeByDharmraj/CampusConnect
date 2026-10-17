import { ApiError } from "../utils/ApiError.js";

export function notFound(req, res, next) {
  next(
    new ApiError(
      404,
      "ROUTE_NOT_FOUND",
      "The requested API route was not found.",
    ),
  );
}
