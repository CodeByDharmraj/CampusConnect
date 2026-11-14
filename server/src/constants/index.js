const roles = require('./roles')
const { HTTP_STATUS } = require('./httpStatus')

module.exports = {
  ...roles,
  HTTP_STATUS,
}
