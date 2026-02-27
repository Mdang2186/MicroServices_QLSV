export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN_STAFF = 'ADMIN_STAFF',
    STUDENT = 'STUDENT',
    LECTURER = 'LECTURER',
}

export enum StudentStatus {
    ACTIVE = 'ACTIVE',
    RESERVED = 'RESERVED',
    DROPOUT = 'DROPOUT',
    GRADUATED = 'GRADUATED',
}

export enum EnrollStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}
