import { ApiError } from "../utils/ApiError.js";

export function validate(schema, source = "body") {
  return function (req, res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          "Request validation failed.",
          details,
        ),
      );
    }

    req.validated ??= {};
    req.validated[source] = result.data;

    next();
  };
}
