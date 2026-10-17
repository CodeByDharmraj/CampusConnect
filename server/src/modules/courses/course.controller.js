import * as courseService from "./course.service.js";

export async function listCourses(req, res, next) {
  try {
    const courses = await courseService.listCourses(
      req.user,
      req.validated.query,
    );

    res.status(200).json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourse(req, res, next) {
  try {
    const course = await courseService.getCourseById(
      req.validated.params.courseId,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: { course },
    });
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse(req.validated.body);

    res.status(201).json({
      success: true,
      data: { course },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await courseService.updateCourse(
      req.validated.params.courseId,
      req.validated.body,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: { course },
    });
  } catch (error) {
    next(error);
  }
}

export async function listEnrollments(req, res, next) {
  try {
    const enrollments = await courseService.listCourseEnrollments(
      req.validated.params.courseId,
    );

    res.status(200).json({
      success: true,
      data: { enrollments },
    });
  } catch (error) {
    next(error);
  }
}

export async function createEnrollment(req, res, next) {
  try {
    const enrollment = await courseService.enrollStudent(
      req.validated.params.courseId,
      req.validated.body.studentId,
    );

    res.status(201).json({
      success: true,
      data: { enrollment },
    });
  } catch (error) {
    next(error);
  }
}
