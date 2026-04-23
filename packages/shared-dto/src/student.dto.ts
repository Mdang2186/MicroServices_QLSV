import { StudentStatus } from './enums';

export interface FamilyMemberDto {
    id?: string;
    relationship: string;
    fullName: string;
    birthYear?: number;
    job?: string;
    phone?: string;
    ethnicity?: string;
    religion?: string;
    nationality?: string;
    workplace?: string;
    position?: string;
    address?: string;
}

export interface CreateStudentDto {
    studentCode: string;
    fullName: string;
    email: string;
    dob: string;
    majorId: string;
    phone?: string;
    address?: string;
    gender?: string;
    citizenId?: string;
    emailPersonal?: string;
    // Identification
    idIssueDate?: string;
    idIssuePlace?: string;

    // Academic Details
    admissionDate?: string;
    campus?: string;
    educationLevel?: string;
    educationType?: string;
    intake?: string;
    region?: string;
    status?: StudentStatus;
    userId?: string;
    adminClassId?: string;
    specializationId?: string;

    // Social/Politic
    policyBeneficiary?: string;
    youthUnionDate?: string;
    partyDate?: string;

    // Demographic
    ethnicity?: string;
    religion?: string;
    nationality?: string;
    birthPlace?: string;
    permanentAddress?: string;

    // Bank
    bankName?: string;
    bankBranch?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;

    // Grades/Stats
    gpa?: number;
    cpa?: number;
    totalEarnedCredits?: number;
    warningLevel?: number;
    academicStatus?: string;
    isActive?: boolean;
    familyMembers?: FamilyMemberDto[];
}

export interface UpdateStudentDto extends Partial<CreateStudentDto> { }

export interface StudentResponse {
    id: string;
    studentCode: string;
    fullName: string;
    email: string;
    dob: Date;
    status: StudentStatus;
    majorId: string;
    adminClassId?: string;
    specializationId?: string;
    specialization?: any;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    phone?: string;
    address?: string;
    gender?: string;
    citizenId?: string;
    emailPersonal?: string;
    admissionDate?: Date;
    campus?: string;
    educationLevel?: string;
    educationType?: string;
    intake?: string;
    ethnicity?: string;
    religion?: string;
    nationality?: string;
    region?: string;
    idIssueDate?: Date;
    idIssuePlace?: string;
    policyBeneficiary?: string;
    youthUnionDate?: Date;
    partyDate?: Date;
    birthPlace?: string;
    permanentAddress?: string;
    bankName?: string;
    bankBranch?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    gpa: number;
    cpa: number;
    totalEarnedCredits: number;
    warningLevel: number;
    academicStatus: string;
    familyMembers?: FamilyMemberDto[];
}
