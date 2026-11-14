const asyncHandler = require('../utils/asyncHandler')
const dashboardService = require('../services/dashboardService')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary(req.user)
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { summary } })
})

module.exports = {
  getDashboardSummary,
}
