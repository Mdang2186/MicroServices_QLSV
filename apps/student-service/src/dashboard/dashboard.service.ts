
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats() {
        // Run in parallel for performance
        const [
            totalStudents,
            activeCourses,
            revenueAgg,
            enrollmentCount,
            attendanceAgg,
            recentEnrollmentsRaw,
            attendanceGradesRaw,
            coursePopularityRaw,
            enrollmentsRaw,

            // New UNETI stats
            totalFaculties,
            totalMajors,
            totalAdminClasses,
            totalLecturers,
            gpaDistributionRaw
        ] = await Promise.all([
            this.prisma.student.count(),
            this.prisma.courseClass.count(),
            this.prisma.enrollment.aggregate({
                _sum: { tuitionFee: true }
            }),
            this.prisma.enrollment.count(),
            this.prisma.grade.aggregate({
                _avg: { attendanceScore: true }
            }),
            // Recent Enrollments
            this.prisma.enrollment.findMany({
                take: 5,
                orderBy: { registeredAt: 'desc' },
                include: {
                    student: true,
                    courseClass: { include: { subject: true } }
                }
            }),
            // Attendance Distribution (fetch minimal needed to bucket)
            this.prisma.grade.findMany({
                select: { attendanceScore: true },
                where: { attendanceScore: { not: null } }
            }),
            // Course Popularity: we'll group by courseClassId and get counts
            this.prisma.enrollment.groupBy({
                by: ['courseClassId'],
                _count: { studentId: true },
                orderBy: { _count: { studentId: 'desc' } },
                take: 6
            }),
            // For Enrollment Trends we'll fetch all with registeredAt and group in memory (Sql-server Prisma grouped-date is tricky)
            this.prisma.enrollment.findMany({
                select: { registeredAt: true }
            }),

            // Execute System Stats (UNETI)
            this.prisma.faculty.count(),
            this.prisma.major.count(),
            this.prisma.adminClass.count(),
            this.prisma.lecturer.count(),

            // GPA Distribution
            this.prisma.student.findMany({
                select: { gpa: true }
            })
        ]);

        // Process Recent Enrollments
        const recentEnrollments = recentEnrollmentsRaw.map(e => ({
            name: e.student.fullName,
            course: e.courseClass.subject.name,
            time: e.registeredAt.toISOString(),
            img: e.student.fullName.substring(0, 2).toUpperCase()
        }));

        // Process Attendance Distribution Buckets
        const attendanceDistribution = [
            { name: "Excellent (9-10)", value: 0, color: "#22c55e" },
            { name: "Good (7-8)", value: 0, color: "#3b82f6" },
            { name: "Average (5-6)", value: 0, color: "#eab308" },
            { name: "Poor (< 5)", value: 0, color: "#ef4444" }
        ];

        attendanceGradesRaw.forEach(g => {
            const score = g.attendanceScore!;
            if (score >= 9) attendanceDistribution[0].value++;
            else if (score >= 7) attendanceDistribution[1].value++;
            else if (score >= 5) attendanceDistribution[2].value++;
            else attendanceDistribution[3].value++;
        });

        // Process GPA Distribution Buckets (UNETI 4.0 Scale)
        const gpaDistribution = [
            { name: "Xuất sắc (3.6 - 4.0)", value: 0, color: "#8b5cf6" }, // purple-500
            { name: "Giỏi (3.2 - 3.59)", value: 0, color: "#3b82f6" },    // blue-500
            { name: "Khá (2.5 - 3.19)", value: 0, color: "#06b6d4" },     // cyan-500
            { name: "Trung bình (2.0 - 2.49)", value: 0, color: "#eab308" }, // yellow-500
            { name: "Yếu (< 2.0)", value: 0, color: "#ef4444" }           // red-500
        ];

        gpaDistributionRaw.forEach(s => {
            const gpa = s.gpa;
            if (gpa >= 3.6) gpaDistribution[0].value++;
            else if (gpa >= 3.2) gpaDistribution[1].value++;
            else if (gpa >= 2.5) gpaDistribution[2].value++;
            else if (gpa >= 2.0) gpaDistribution[3].value++;
            else gpaDistribution[4].value++;
        });

        // Process Course Popularity
        // We need the subject names for the top classes
        const topCourseIds = coursePopularityRaw.map(c => c.courseClassId);
        const topCoursesClasses = await this.prisma.courseClass.findMany({
            where: { id: { in: topCourseIds } },
            include: { subject: true }
        });

        const coursePopularity = coursePopularityRaw.map(c => {
            const courseClass = topCoursesClasses.find(tcc => tcc.id === c.courseClassId);
            // generate a short name from subject name e.g "Software Engineering" -> "SE"
            const shortName = courseClass?.subject.name.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase() || 'UNK';
            return {
                name: shortName,
                fullName: courseClass?.subject.name,
                value: c._count.studentId
            };
        });

        // Process Enrollment Trends (last 6 months)
        const trendsMap = new Map<string, number>();
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toLocaleString('default', { month: 'short' });
            trendsMap.set(monthStr, 0); // Initialize
        }

        enrollmentsRaw.forEach(e => {
            const d = e.registeredAt;
            // Only count if it's within our tracked months
            const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
            if (diffMonths >= 0 && diffMonths <= 5) {
                const monthStr = d.toLocaleString('default', { month: 'short' });
                if (trendsMap.has(monthStr)) {
                    trendsMap.set(monthStr, trendsMap.get(monthStr)! + 1);
                }
            }
        });

        const enrollmentTrends = Array.from(trendsMap.entries()).map(([name, enrollments]) => ({
            name,
            enrollments
        }));

        // Calculate dynamic credits data based on GPA assuming fixed formulas or rough estimates 
        // In real system we'd sum this from Debt but for Dashboard overview we can approximate based on seeded credits
        const totalCreditsAssigned = await this.prisma.student.aggregate({
            _sum: { totalCredits: true }
        });

        return {
            totalStudents,
            activeCourses,
            totalRevenue: Number(revenueAgg._sum.tuitionFee || 0),
            enrollmentCount,
            attendanceRate: Math.round(attendanceAgg._avg.attendanceScore || 0) * 10, // Assuming out of 10, scale to 100%
            recentEnrollments,
            attendanceDistribution,
            coursePopularity,
            enrollmentTrends,

            // Export UNETI new fields
            systemStats: {
                totalFaculties,
                totalMajors,
                totalAdminClasses,
                totalLecturers
            },
            gpaDistribution,
            totalCreditsAssigned: totalCreditsAssigned._sum.totalCredits || 0
        };
    }
}
