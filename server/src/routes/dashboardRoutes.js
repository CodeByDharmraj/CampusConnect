const express = require('express')
const authenticate = require('../middleware/authenticate')
const asyncHandler = require('../utils/asyncHandler')
const dashboardService = require('../services/dashboardService')

const router = express.Router()

router.use(authenticate)

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const summary = await dashboardService.getDashboardSummary(req.user)
    return res.status(200).json({ success: true, data: { summary } })
  }),
)

module.exports = router
