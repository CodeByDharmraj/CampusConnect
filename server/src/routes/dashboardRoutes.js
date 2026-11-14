const express = require('express')

const authenticate = require('../middleware/authenticate')

const dashboardController = require('../controllers/dashboardController')

const router = express.Router()

router.use(authenticate)

router.get('/summary', dashboardController.getDashboardSummary)

module.exports = router
