class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Erori prevăzute de noi (nu bug-uri de sistem)

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;