import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid MongoDB ID.");

export const courseIdParamsSchema = z
  .object({
    courseId: objectIdSchema,
  })
  .strict();

export const createCourseSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .transform((value) => value.toUpperCase()),

    title: z.string().trim().min(2).max(150),

    description: z.string().trim().max(2000).optional(),

    faculty: objectIdSchema,

    department: z.string().trim().min(2).max(100),

    semester: z.number().int().min(1).max(12),
  })
  .strict();

export const updateCourseSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .transform((value) => value.toUpperCase())
      .optional(),

    title: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    faculty: objectIdSchema.optional(),
    department: z.string().trim().min(2).max(100).optional(),
    semester: z.number().int().min(1).max(12).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const listCoursesQuerySchema = z
  .object({
    semester: z.coerce.number().int().min(1).max(12).optional(),
    department: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const createEnrollmentSchema = z
  .object({
    studentId: objectIdSchema,
  })
  .strict();
