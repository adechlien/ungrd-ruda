export class ApiError extends Error {
 constructor(status, message, issues = []) {
  super(message);
  this.status = status;
  this.issues = issues;
 }
}
