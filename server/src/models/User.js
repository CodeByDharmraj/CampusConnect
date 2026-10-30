const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const SALT_ROUNDS = 12
const MAX_PASSWORD_BYTES = 72

const USER_ROLES = ['student', 'faculty', 'coordinator', 'admin']
const DEPARTMENT_REQUIRED_ROLES = ['student', 'coordinator']

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must contain at least 2 characters.'],
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      required: [true, 'User role is required.'],
      default: 'student',
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: function departmentRequired() {
        return DEPARTMENT_REQUIRED_ROLES.includes(this.role)
      },
      validate: {
        validator(value) {
          if (DEPARTMENT_REQUIRED_ROLES.includes(this.role)) {
            return value != null
          }

          return value == null
        },
        message:
          'Only students and coordinators must have a primary department.',
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        return ret
      },
    },
    toObject: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        return ret
      },
    },
  },
)

// Enforce unique email addresses at the database level.
userSchema.index({ email: 1 }, { unique: true })

// Supports queries that filter users by role and account status.
userSchema.index({ role: 1, isActive: 1 })

// Supports department-scoped user queries.
userSchema.index({ departmentId: 1, role: 1, isActive: 1 })

// Hash a password before assigning it to the document.
userSchema.methods.setPassword = async function setPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new TypeError('Password must contain at least 8 characters.')
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new TypeError('Password exceeds the supported bcrypt byte limit.')
  }

  this.passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
}

// Verify a password without storing or returning the plaintext value.
userSchema.methods.verifyPassword = async function verifyPassword(password) {
  if (
    typeof password !== 'string' ||
    !this.passwordHash ||
    Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
  ) {
    return false
  }

  return bcrypt.compare(password, this.passwordHash)
}

const User = mongoose.model('User', userSchema)

module.exports = User
module.exports.USER_ROLES = USER_ROLES
