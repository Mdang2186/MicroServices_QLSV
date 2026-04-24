"use client";

import { StudentService } from "@/services/student.service";
import {
    getStudentProfileId,
    getStudentUserId,
    readStudentSessionUser,
    type StudentSessionUser,
} from "@/lib/student-session";

export type CurrentStudentContext = {
    sessionUser: StudentSessionUser | null;
    userId: string | null;
    studentId: string | null;
    profile: any | null;
};

export async function resolveCurrentStudentContext(): Promise<CurrentStudentContext> {
    const sessionUser = readStudentSessionUser();
    const userId = getStudentUserId(sessionUser);
    const profileId = getStudentProfileId(sessionUser);

    if (profileId) {
        const profile = await StudentService.getProfileSummary(profileId).catch(() => null);
        return {
            sessionUser,
            userId,
            studentId: profile?.id || profileId,
            profile: profile || sessionUser?.student || sessionUser || null,
        };
    }

    if (userId) {
        try {
            let profile = await StudentService.getProfileSummary(userId);
            
            // If not found, try fetching as a Lecturer
            if (!profile) {
                profile = await StudentService.getLecturerProfile(userId);
            }

            return {
                sessionUser,
                userId,
                studentId: profile?.id || profileId || null,
                profile: profile || null,
            };
        } catch {
            // Fall back to direct student lookup when the session still has a profile id.
        }
    }

    return {
        sessionUser,
        userId: null,
        studentId: null,
        profile: null,
    };
}
