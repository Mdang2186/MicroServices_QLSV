"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollStatus = exports.StudentStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["SUPER_ADMIN"] = "SUPER_ADMIN";
    Role["ADMIN_STAFF"] = "ADMIN_STAFF";
    Role["STUDENT"] = "STUDENT";
    Role["LECTURER"] = "LECTURER";
})(Role || (exports.Role = Role = {}));
var StudentStatus;
(function (StudentStatus) {
    StudentStatus["ACTIVE"] = "ACTIVE";
    StudentStatus["RESERVED"] = "RESERVED";
    StudentStatus["DROPOUT"] = "DROPOUT";
    StudentStatus["GRADUATED"] = "GRADUATED";
})(StudentStatus || (exports.StudentStatus = StudentStatus = {}));
var EnrollStatus;
(function (EnrollStatus) {
    EnrollStatus["PENDING"] = "PENDING";
    EnrollStatus["SUCCESS"] = "SUCCESS";
    EnrollStatus["FAILED"] = "FAILED";
    EnrollStatus["CANCELLED"] = "CANCELLED";
})(EnrollStatus || (exports.EnrollStatus = EnrollStatus = {}));
//# sourceMappingURL=enums.js.map