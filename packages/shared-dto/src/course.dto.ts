
export interface CreateCourseClassDto {
    subjectId: string;
    semesterId: string;
    lecturerId?: string;
    code: string;
    name: string;
    tuitionMultiplier?: number;
    maxSlots?: number;
    status?: string;
    adminClassIds?: string[];
}

export interface UpdateCourseClassDto {
    subjectId?: string;
    semesterId?: string;
    lecturerId?: string;
    code?: string;
    name?: string;
    tuitionMultiplier?: number;
    maxSlots?: number;
    status?: string;
    adminClassIds?: string[];
}

export interface CourseClassResponse {
    id: string;
    subjectId: string;
    semesterId: string;
    lecturerId?: string;
    code: string;
    name: string;
    tuitionMultiplier: number;
    maxSlots: number;
    currentSlots: number;
    status: string;
    subject: {
        id: string;
        name: string;
        code: string;
    };
    semester: {
        id: string;
        name: string;
    };
    lecturer?: {
        id: string;
        fullName: string;
    };
    adminClasses: {
        id: string;
        code: string;
        name: string;
    }[];
    _count?: {
        enrollments: number;
    };
}
