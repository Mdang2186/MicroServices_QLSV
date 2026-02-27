import { StudentStatus } from './enums';
export interface CreateStudentDto {
    studentCode: string;
    fullName: string;
    email: string;
    dob: string;
    majorId: string;
    phone?: string;
    address?: string;
    status?: StudentStatus;
    userId?: string;
}
export interface UpdateStudentDto extends Partial<CreateStudentDto> {
}
export interface StudentResponse {
    id: string;
    studentCode: string;
    fullName: string;
    email: string;
    dob: Date;
    status: StudentStatus;
    majorId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
