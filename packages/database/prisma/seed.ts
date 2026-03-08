import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================================
// 1. BỘ TỪ ĐIỂN TẠO DỮ LIỆU MẪU (DETERMINISTIC DATA)
// ============================================================================
const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Mã", "Quách", "Tạ", "Lục"];
const middleNamesMale = ["Văn", "Hữu", "Đức", "Công", "Quang", "Minh", "Hoàng", "Thế", "Đình", "Xuân", "Mạnh", "Tuấn", "Trọng", "Phú", "Khả", "Gia", "Bảo", "Lạc"];
const middleNamesFemale = ["Thị", "Ngọc", "Thu", "Phương", "Mai", "Thanh", "Bích", "Hồng", "Kim", "Lan", "Diễm", "Kiều", "Thúy", "Mỹ", "Diệu", "Tâm", "Khánh"];
const firstNamesMale = ["Anh", "Bảo", "Cường", "Dũng", "Dương", "Đạt", "Hải", "Hiếu", "Huy", "Khang", "Khoa", "Kiên", "Lâm", "Long", "Nam", "Nghĩa", "Phát", "Phúc", "Quân", "Thắng", "Thành", "Thiên", "Thịnh", "Trung", "Tuấn", "Việt", "Đông", "Phong", "Sơn", "Tùng"];
const firstNamesFemale = ["An", "Anh", "Châu", "Chi", "Diệp", "Hà", "Hân", "Hoa", "Huyền", "Linh", "Ly", "Mai", "Ngân", "Nhi", "Nhung", "Oanh", "Quyên", "Quỳnh", "Trâm", "Trang", "Tú", "Uyên", "Vy", "Yến", "Thảo", "Tươi", "Nguyệt"];
const provinces = ["Hà Nội", "Hà Nam", "Nam Định", "Thái Bình", "Ninh Bình", "Hưng Yên", "Hải Dương", "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Bắc Giang", "Phú Thọ", "Vĩnh Phúc", "Thái Nguyên", "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Huế", "Đà Nẵng"];

const getEl = (arr: any[], index: number) => arr[index % arr.length];
const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

// ============================================================================
// 2. KỊCH BẢN SEED CHÍNH
// ============================================================================
async function main() {
    console.log("🚀 Starting database cleanup...");

    // Delete in reverse order of foreign key constraints
    await prisma.feeTransaction.deleteMany();
    await prisma.studentFee.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.trainingScore.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.grade.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.student.deleteMany();
    await prisma.classSchedule.deleteMany();
    await prisma.room.deleteMany();
    await prisma.courseClass.deleteMany();
    await prisma.curriculum.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.adminClass.deleteMany();
    await prisma.lecturer.deleteMany();
    await prisma.major.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.user.deleteMany();

    console.log("🌱 Database cleaned. Seeding new data for 2026...");

    const defaultPassword = await bcrypt.hash("123456", 10);

    // --- 1. IAM (Admin & Staff) ---
    const adminCode = "admin";
    await prisma.user.create({
        data: {
            id: `USR_${adminCode}`,
            username: adminCode,
            email: "admin@uneti.edu.vn",
            passwordHash: defaultPassword,
            role: "SUPER_ADMIN",
            avatarUrl: "https://ui-avatars.com/api/?name=Admin+Uneti&background=0D8ABC&color=fff",
            isActive: true,
        },
    });

    const staffNames = ["staff1", "staff2", "staff3"];
    for (const name of staffNames) {
        await prisma.user.create({
            data: {
                id: `USR_${name}`,
                username: name,
                email: `${name}@uneti.edu.vn`,
                passwordHash: defaultPassword,
                role: "ACADEMIC_STAFF",
                avatarUrl: `https://ui-avatars.com/api/?name=Staff+${name}&background=28B463&color=fff`,
                isActive: true,
            },
        });
    }

    // --- 2. Semesters & Rooms ---
    console.log("➤ Creating Semesters & Rooms...");
    const semSummer = await prisma.semester.create({
        data: {
            id: "SEM_HKH_2526",
            code: "HKH_2025_2026",
            name: "Học kỳ Hè Năm học 2025-2026",
            year: 2026,
            startDate: new Date("2026-06-01"),
            endDate: new Date("2026-08-31"),
            isCurrent: false,
        },
    });

    const sem1 = await prisma.semester.create({
        data: {
            id: "SEM_HK1_2627",
            code: "HK1_2026_2027",
            name: "Học kỳ 1 Năm học 2026-2027",
            year: 2026,
            startDate: new Date("2026-09-05"),
            endDate: new Date("2027-01-15"),
            isCurrent: true,
            registerStartDate: new Date("2026-08-01"),
            registerEndDate: new Date("2026-08-20"),
        },
    });

    const sem2 = await prisma.semester.create({
        data: {
            id: "SEM_HK2_2627",
            code: "HK2_2026_2027",
            name: "Học kỳ 2 Năm học 2026-2027",
            year: 2027,
            startDate: new Date("2027-02-15"),
            endDate: new Date("2027-06-30"),
            isCurrent: false,
            registerStartDate: new Date("2027-01-01"),
            registerEndDate: new Date("2027-01-15"),
        },
    });

    const rooms = [];
    for (let i = 1; i <= 10; i++) {
        rooms.push(await prisma.room.create({ data: { id: `ROOM_P${100 + i}`, name: `P.${100 + i}`, building: "HA8", capacity: 60, type: "THEORY" } }));
        rooms.push(await prisma.room.create({ data: { id: `ROOM_L${200 + i}`, name: `Lab.${200 + i}`, building: "HA9", capacity: 40, type: "PRACTICE" } }));
    }

    // --- 3. Faculties & Majors ---
    console.log("➤ Creating Faculties & Majors...");
    const faculties = [
        { id: "FAC_CNTT", code: "CNTT", name: "Khoa Công nghệ Thông tin", dean: "PGS.TS Nguyễn Văn IT" },
        { id: "FAC_KT", code: "KT", name: "Khoa Kinh tế", dean: "TS. Trần Thị Kinh Tế" },
        { id: "FAC_NN", code: "NN", name: "Khoa Ngoại ngữ", dean: "ThS. Lê Văn Anh" },
    ];

    for (const f of faculties) {
        await prisma.faculty.create({
            data: { id: f.id, code: f.code, name: f.name, deanName: f.dean }
        });
    }

    const majors = [
        { id: "MAJ_KTPM", facultyId: "FAC_CNTT", code: "KTPM", name: "Kỹ thuật phần mềm", credits: 150, mCode: "103" },
        { id: "MAJ_KHMT", facultyId: "FAC_CNTT", code: "KHMT", name: "Khoa học máy tính", credits: 150, mCode: "101" },
        { id: "MAJ_QTKD", facultyId: "FAC_KT", code: "QTKD", name: "Quản trị kinh doanh", credits: 135, mCode: "205" },
        { id: "MAJ_KETOAN", facultyId: "FAC_KT", code: "KTK", name: "Kế toán", credits: 135, mCode: "201" },
        { id: "MAJ_NNA", facultyId: "FAC_NN", code: "NNA", name: "Ngôn ngữ Anh", credits: 130, mCode: "301" },
        { id: "MAJ_NNT", facultyId: "FAC_NN", code: "NNT", name: "Ngôn ngữ Trung", credits: 130, mCode: "302" },
    ];

    for (const m of majors) {
        await prisma.major.create({
            data: { id: m.id, facultyId: m.facultyId, code: m.code, name: m.name, totalCreditsRequired: m.credits }
        });
    }

    // --- 4. Subjects ---
    console.log("➤ Creating Subjects...");
    const subjectData = [
        { id: "SUB_CS01", majorId: "MAJ_KTPM", code: "CS01", name: "Cơ sở dữ liệu", credits: 3 },
        { id: "SUB_CS02", majorId: "MAJ_KTPM", code: "CS02", name: "Lập trình Web", credits: 3 },
        { id: "SUB_CS03", majorId: "MAJ_KHMT", code: "CS03", name: "Trí tuệ nhân tạo", credits: 3 },
        { id: "SUB_CS04", majorId: "MAJ_KHMT", code: "CS04", name: "Học máy", credits: 4 },
        { id: "SUB_BM01", majorId: "MAJ_QTKD", code: "BM01", name: "Quản trị học", credits: 3 },
        { id: "SUB_BM02", majorId: "MAJ_QTKD", code: "BM02", name: "Marketing căn bản", credits: 3 },
        { id: "SUB_BM03", majorId: "MAJ_KETOAN", code: "BM03", name: "Nguyên lý kế toán", credits: 3 },
        { id: "SUB_BM04", majorId: "MAJ_KETOAN", code: "BM04", name: "Kế toán tài chính", credits: 4 },
        { id: "SUB_EN01", majorId: "MAJ_NNA", code: "EN01", name: "Tiếng Anh chuyên ngành 1", credits: 3 },
        { id: "SUB_EN02", majorId: "MAJ_NNA", code: "EN02", name: "Kỹ năng nghe nói 1", credits: 3 },
        { id: "SUB_ZH01", majorId: "MAJ_NNT", code: "ZH01", name: "Hán ngữ cơ sở 1", credits: 4 },
        { id: "SUB_ZH02", majorId: "MAJ_NNT", code: "ZH02", name: "Hán ngữ nâng cao", credits: 3 },
    ];

    for (const s of subjectData) {
        await prisma.subject.create({
            data: {
                id: s.id,
                majorId: s.majorId,
                code: s.code,
                name: s.name,
                credits: s.credits,
                theoryHours: s.credits * 15,
                practiceHours: 0,
                department: "Bộ môn Chuyên ngành",
                description: `Mô tả môn học ${s.name}`
            }
        });
    }

    // --- 5. Lecturers ---
    console.log("➤ Creating 10 Lecturers...");
    const lecturers = [];
    for (let i = 1; i <= 10; i++) {
        const code = `300000000${i.toString().padStart(2, '0')}`;
        const isMale = i % 2 !== 0;
        const fullName = `${getEl(lastNames, i)} ${isMale ? getEl(middleNamesMale, i) : getEl(middleNamesFemale, i)} ${isMale ? getEl(firstNamesMale, i) : getEl(firstNamesFemale, i)}`;
        const facultyId = i <= 4 ? "FAC_CNTT" : i <= 7 ? "FAC_KT" : "FAC_NN";

        const user = await prisma.user.create({
            data: {
                id: `USR_${code}`, username: code, email: `gv${i}@uneti.edu.vn`, passwordHash: defaultPassword, role: "LECTURER",
                avatarUrl: `https://i.pravatar.cc/150?u=${code}`
            }
        });

        const lect = await prisma.lecturer.create({
            data: {
                id: `LEC_${code}`, userId: user.id, facultyId, lectureCode: code, fullName, degree: getEl(["Thạc sĩ", "Tiến sĩ", "PGS.TS"], i), phone: `098711${code.slice(-5)}`
            }
        });
        lecturers.push(lect);
    }

    // --- 6. Admin Classes & 150 Students ---
    console.log("➤ Creating 150 Students across 6 Admin Classes...");
    const adminClasses = [];
    for (const m of majors) {
        const classCode = `${m.code}15A${majors.indexOf(m) + 1}`;
        const adminClass = await prisma.adminClass.create({
            data: { id: `ACLASS_${classCode}`, code: classCode, name: `Lớp ${classCode}`, majorId: m.id, cohort: "K15", advisorId: lecturers[majors.indexOf(m) % lecturers.length].id }
        });
        adminClasses.push({ ...adminClass, mCode: m.mCode });
    }

    const students = [];

    // Create one fixed student for easy login
    const fixedSvCode = "22103100001";
    const fixedUser = await prisma.user.create({
        data: {
            id: `USR_${fixedSvCode}`, username: fixedSvCode, email: `student@uneti.edu.vn`, passwordHash: defaultPassword, role: "STUDENT",
            avatarUrl: `https://i.pravatar.cc/150?u=${fixedSvCode}`
        }
    });
    const fixedStudent = await prisma.student.create({
        data: {
            id: `STD_${fixedSvCode}`,
            userId: fixedUser.id,
            adminClassId: adminClasses[0].id,
            majorId: adminClasses[0].majorId,
            studentCode: "22103100001",
            fullName: "Nguyễn Văn Sinh Viên",
            dob: new Date(2004, 0, 1),
            gender: "Nam",
            phone: "0312345678",
            address: "Số 1, Đường Giải Phóng, Hà Nội",
            status: "STUDYING",
            citizenId: "001204000001",
            emailPersonal: "sinhvien@gmail.com",
            admissionDate: new Date("2022-09-01"),
            campus: "Hà Nội",
            educationLevel: "Đại học",
            educationType: "Chính quy",
            intake: "K16",
            ethnicity: "Kinh",
            religion: "Không",
            nationality: "Việt Nam",
            region: "Khu vực 1",
            idIssueDate: new Date("2020-01-01"),
            idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
            policyBeneficiary: "Không",
            youthUnionDate: new Date("2019-03-26"),
            partyDate: new Date("2025-05-19"),
            birthPlace: "Hà Nội",
            permanentAddress: "Hà Nội",
            bankName: "VietinBank",
            bankBranch: "Hai Bà Trưng",
            bankAccountName: "NGUYEN VAN SINH VIEN",
            bankAccountNumber: "100872000001",
            gpa: 3.5,
            cpa: 3.4,
            totalEarnedCredits: 60
        }
    });
    students.push(fixedStudent);

    for (let i = 1; i <= 49; i++) {
        const clsIndex = i % adminClasses.length;
        const cls = adminClasses[clsIndex];
        const mCode = cls.mCode;
        const svCode = `22${mCode}1${i.toString().padStart(5, '0')}`;
        const isMale = i % 2 === 0;
        const firstName = isMale ? getEl(firstNamesMale, i) : getEl(firstNamesFemale, i);
        const middleName = isMale ? getEl(middleNamesMale, i) : getEl(middleNamesFemale, i);
        const lastName = getEl(lastNames, i);
        const fullName = `${lastName} ${middleName} ${firstName}`;

        const cccd = `001${isMale ? '2' : '3'}04${i.toString().padStart(6, '0')}`;
        const emailPersonal = `${removeAccents(firstName).toLowerCase()}${svCode}@gmail.com`;

        const user = await prisma.user.create({
            data: {
                id: `USR_${svCode}`, username: svCode, email: `${svCode}@uneti.edu.vn`, passwordHash: defaultPassword, role: "STUDENT",
                avatarUrl: `https://i.pravatar.cc/150?u=${svCode}`
            }
        });

        const student = await prisma.student.create({
            data: {
                id: `STD_${svCode}`,
                userId: user.id,
                adminClassId: cls.id,
                majorId: cls.majorId,
                studentCode: svCode,
                fullName,
                dob: new Date(2004, i % 12, (i % 28) + 1),
                gender: isMale ? "Nam" : "Nữ",
                phone: `03${i.toString().padStart(8, '0')}`,
                address: `Số ${i}, Đường Giải Phóng, ${getEl(provinces, i)}`,
                status: "STUDYING",
                citizenId: cccd,
                emailPersonal: emailPersonal,
                admissionDate: new Date("2022-09-01"),
                campus: i % 2 === 0 ? "Hà Nội" : "Nam Định",
                educationLevel: "Đại học",
                educationType: "Chính quy",
                intake: "K16",
                ethnicity: "Kinh",
                religion: "Không",
                nationality: "Việt Nam",
                region: "Khu vực 1",
                idIssueDate: new Date("2020-01-01"),
                idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
                policyBeneficiary: "Không",
                youthUnionDate: new Date("2019-03-26"),
                partyDate: new Date("2025-05-19"),
                birthPlace: getEl(provinces, i),
                permanentAddress: `Xóm ${i}, Xã ${getEl(provinces, i + 1)}, Tỉnh ${getEl(provinces, i + 1)}`,
                bankName: "VietinBank",
                bankBranch: "Hai Bà Trưng",
                bankAccountName: fullName.toUpperCase(),
                bankAccountNumber: `100872${i.toString().padStart(6, '0')}`,
                gpa: 3.2,
                cpa: 3.1,
                totalEarnedCredits: 60
            }
        });

        // Family Members
        await prisma.familyMember.createMany({
            data: [
                {
                    studentId: student.id,
                    relationship: "Cha",
                    fullName: `${lastName} ${getEl(middleNamesMale, i + 2)} ${getEl(firstNamesMale, i + 3)}`,
                    birthYear: 1975,
                    job: "Kỹ sư",
                    phone: `0913${i.toString().padStart(6, '0')}`,
                    ethnicity: "Kinh",
                    religion: "Không",
                    nationality: "Việt Nam",
                    workplace: "Công ty ABC",
                    position: "Trưởng phòng",
                    address: student.address
                },
                {
                    studentId: student.id,
                    relationship: "Mẹ",
                    fullName: `${getEl(lastNames, i + 1)} ${getEl(middleNamesFemale, i + 1)} ${getEl(firstNamesFemale, i + 1)}`,
                    birthYear: 1978,
                    job: "Giáo viên",
                    phone: `0914${i.toString().padStart(6, '0')}`,
                    ethnicity: "Kinh",
                    religion: "Không",
                    nationality: "Việt Nam",
                    workplace: "Trường THPT XYZ",
                    position: "Giáo viên",
                    address: student.address
                }
            ]
        });

        students.push(student);
    }

    // --- 7. Courses, Schedules, Enrollments (HK1 & HK2) ---
    console.log("➤ Generating Courses, Schedules, and Academic Records...");
    const tuitionRate = 450000;

    const semesters = [semSummer, sem1, sem2];
    for (let sIdx = 0; sIdx < semesters.length; sIdx++) {
        const sem = semesters[sIdx];
        const studentCreditsThisSem = new Map<string, number>();

        for (let j = 0; j < subjectData.length; j++) {
            const sub = subjectData[j];
            const courseCode = `${sub.code}_${sem.code.slice(0, 3)}_${j}`;
            const lecturer = lecturers[j % lecturers.length];

            const courseClass = await prisma.courseClass.create({
                data: {
                    id: `CCLASS_${courseCode}`,
                    subjectId: sub.id,
                    semesterId: sem.id,
                    lecturerId: lecturer.id,
                    code: courseCode,
                    name: `${sub.name} [${sem.code}]`,
                    maxSlots: 80,
                    currentSlots: 0,
                    status: "LOCKED"
                }
            });

            // Schedule: Ensure uniqueness by factoring in semester index
            await prisma.classSchedule.create({
                data: {
                    id: `SCH_${courseCode}`,
                    courseClassId: courseClass.id,
                    roomId: rooms[j % rooms.length].id,
                    dayOfWeek: ((j + sIdx) % 6) + 2,
                    startShift: ((j + sIdx * 2) % 4) * 3 + 1,
                    endShift: (((j + sIdx * 2) % 4) * 3 + 1) + 2,
                    type: "THEORY"
                }
            });

            // Enroll all students from the relevant major
            const relevantStudents = students.filter(s => s.majorId === sub.majorId);
            for (const sv of relevantStudents) {
                const enrollment = await prisma.enrollment.create({
                    data: {
                        studentId: sv.id,
                        courseClassId: courseClass.id,
                        status: "SUCCESS",
                        tuitionFee: sub.credits * tuitionRate
                    }
                });

                // Track credits for single fee
                studentCreditsThisSem.set(sv.id, (studentCreditsThisSem.get(sv.id) || 0) + sub.credits);

                // Attendance & Grades
                for (let week = 1; week <= 15; week++) {
                    const attDate = new Date(sem.startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
                    if (attDate <= sem.endDate) {
                        await prisma.attendance.create({
                            data: {
                                enrollmentId: enrollment.id,
                                date: attDate,
                                status: "PRESENT",
                                note: "Sinh viên đi học đầy đủ"
                            }
                        });
                    }
                }

                await prisma.grade.create({
                    data: {
                        studentId: sv.id,
                        courseClassId: courseClass.id,
                        subjectId: sub.id,
                        attendanceScore: 10,
                        regularScore1: 8 + (j % 3),
                        regularScore2: 9,
                        practiceScore: 0,
                        midtermScore: 8.5,
                        finalScore: 8.0,
                        totalScore10: 8.3,
                        totalScore4: 3.5,
                        letterGrade: "B+",
                        isPassed: true
                    }
                });
            }
        }

        // Create consolidated fees per student per semester
        for (const [studentId, totalCredits] of studentCreditsThisSem.entries()) {
            const studentFee = await prisma.studentFee.create({
                data: {
                    studentId,
                    semesterId: sem.id,
                    feeType: "TUITION",
                    name: `Học phí ${sem.name}`,
                    totalAmount: totalCredits * tuitionRate,
                    finalAmount: totalCredits * tuitionRate,
                    paidAmount: totalCredits * tuitionRate,
                    status: "PAID",
                    dueDate: new Date(sem.startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                }
            });

            await prisma.feeTransaction.create({
                data: {
                    studentFeeId: studentFee.id,
                    amount: studentFee.finalAmount,
                    paymentMethod: "BANKING",
                    transactionDate: new Date(sem.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
                    transactionCode: `TX_${studentFee.id.slice(-8)}`
                }
            });

            // Add health insurance fee once per year
            if (sem.id === sem1.id) {
                const insFee = await prisma.studentFee.create({
                    data: {
                        studentId,
                        semesterId: sem.id,
                        feeType: "INSURANCE",
                        name: `Bảo hiểm y tế Năm học 2026-2027`,
                        totalAmount: 702000,
                        finalAmount: 702000,
                        paidAmount: 702000,
                        status: "PAID",
                        dueDate: new Date(sem.startDate.getTime() + 15 * 24 * 60 * 60 * 1000)
                    }
                });

                await prisma.feeTransaction.create({
                    data: {
                        studentFeeId: insFee.id,
                        amount: 702000,
                        paymentMethod: "BANKING",
                        transactionDate: new Date(sem.startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
                        transactionCode: `TX_INS_${insFee.id.slice(-8)}`
                    }
                });
            }
        }
    }

    // --- 8. Final calculations (GPA/CPA) ---
    console.log("➤ Finalizing Student Stats...");
    for (const sv of students) {
        const grades = await prisma.grade.findMany({ where: { studentId: sv.id }, include: { subject: true } });
        let totalPoints = 0;
        let totalCredits = 0;
        let earnedCredits = 0;
        for (const g of grades) {
            totalPoints += g.totalScore4! * g.subject.credits;
            totalCredits += g.subject.credits;
            if (g.isPassed) earnedCredits += g.subject.credits;
        }
        const cpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
        await prisma.student.update({ where: { id: sv.id }, data: { gpa: cpa, cpa, totalEarnedCredits: earnedCredits } });
    }

    console.log("✅ Seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });