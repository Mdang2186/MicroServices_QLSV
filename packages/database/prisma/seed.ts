import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================================
// 1. BỘ TỪ ĐIỂN TẠO DỮ LIỆU MẪU (DETERMINISTIC DATA - KHÔNG DÙNG RANDOM)
// ============================================================================
const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const middleNamesMale = ["Văn", "Hữu", "Đức", "Công", "Quang", "Minh", "Hoàng", "Thế", "Đình", "Xuân", "Mạnh", "Tuấn", "Trọng", "Phú"];
const middleNamesFemale = ["Thị", "Ngọc", "Thu", "Phương", "Mai", "Thanh", "Bích", "Hồng", "Kim", "Lan", "Diễm", "Kiều", "Thúy"];
const firstNamesMale = ["Anh", "Bảo", "Cường", "Dũng", "Dương", "Đạt", "Hải", "Hiếu", "Huy", "Khang", "Khoa", "Kiên", "Lâm", "Long", "Nam", "Nghĩa", "Phát", "Phúc", "Quân", "Thắng", "Thành", "Thiên", "Thịnh", "Trung", "Tuấn", "Việt"];
const firstNamesFemale = ["An", "Anh", "Châu", "Chi", "Diệp", "Hà", "Hân", "Hoa", "Huyền", "Linh", "Ly", "Mai", "Ngân", "Nhi", "Nhung", "Oanh", "Quyên", "Quỳnh", "Trâm", "Trang", "Tú", "Uyên", "Vy", "Yến"];
const provinces = ["Hà Nội", "Hà Nam", "Nam Định", "Thái Bình", "Ninh Bình", "Hưng Yên", "Hải Dương", "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Bắc Giang", "Phú Thọ", "Vĩnh Phúc", "Thái Nguyên", "Thanh Hóa", "Nghệ An", "Hà Tĩnh"];

// --- Hàm tiện ích lấy dữ liệu theo quy luật (Deterministic) ---
const getEl = (arr: any[], index: number) => arr[index % arr.length];
const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

// ============================================================================
// 2. KỊCH BẢN SEED CHÍNH (Ghi đè thủ công UUID bằng String có nghĩa)
// ============================================================================
async function main() {
    console.log("🚀 Bắt đầu dọn dẹp Database cũ (Clean up)...");

    // Xóa theo thứ tự Ràng buộc Khóa ngoại (Foreign Key)
    await prisma.tuitionTransaction.deleteMany();
    await prisma.tuitionFee.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.grade.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.classSchedule.deleteMany();
    await prisma.room.deleteMany();
    await prisma.courseClass.deleteMany();
    await prisma.prerequisite.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.adminClass.deleteMany();
    await prisma.lecturer.deleteMany();
    await prisma.major.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.user.deleteMany();

    console.log("🌱 Database đã sạch. Bắt đầu gieo hạt dữ liệu mô hình UNETI (Quy tắc ID 11 số tuyệt đối, bao gồm ID Primary Key)...");

    const defaultPassword = await bcrypt.hash("123456", 10);

    // --- 1. TẠO TÀI KHOẢN ADMIN & PHÒNG ĐÀO TẠO (MÃ 11 SỐ) ---
    console.log("➤ Khởi tạo hệ thống Admin & Nhân viên Phòng Đào tạo...");

    const adminCode = "90000000001";
    await prisma.user.create({
        data: {
            id: `USR_${adminCode}`,
            username: adminCode,
            email: "admin@uneti.edu.vn",
            passwordHash: defaultPassword,
            role: "SUPER_ADMIN",
            avatarUrl: "https://ui-avatars.com/api/?name=Admin+Uneti&background=0D8ABC&color=fff",
            isActive: true,
            lastLogin: new Date(),
        },
    });

    const staffCodes = ["80000000001", "80000000002"];
    await prisma.user.createMany({
        data: [
            {
                id: `USR_${staffCodes[0]}`,
                username: staffCodes[0],
                email: "daotao1@uneti.edu.vn",
                passwordHash: defaultPassword,
                role: "ACADEMIC_STAFF",
                avatarUrl: "https://ui-avatars.com/api/?name=Phong+Dao+Tao+1&background=28B463&color=fff",
                isActive: true,
            },
            {
                id: `USR_${staffCodes[1]}`,
                username: staffCodes[1],
                email: "daotao2@uneti.edu.vn",
                passwordHash: defaultPassword,
                role: "ACADEMIC_STAFF",
                avatarUrl: "https://ui-avatars.com/api/?name=Phong+Dao+Tao+2&background=28B463&color=fff",
                isActive: true,
            }
        ]
    });

    // --- 2. TẠO HỌC KỲ VÀ PHÒNG HỌC ---
    console.log("➤ Khởi tạo Học kỳ và Phòng học...");
    const semCode = "HK1_2025_2026";
    const semester = await prisma.semester.create({
        data: {
            id: `SEM_${semCode}`,
            code: semCode,
            name: "Học kỳ 1 Năm học 2025-2026",
            year: 2025,
            startDate: new Date("2025-09-05"),
            endDate: new Date("2026-01-15"),
            isCurrent: true,
            registerStartDate: new Date("2025-08-15"),
            registerEndDate: new Date("2025-08-30"),
        },
    });

    const rooms = [];
    for (let i = 1; i <= 6; i++) {
        rooms.push(await prisma.room.create({ data: { id: `ROOM_P30${i}`, name: `P.${300 + i}`, building: "HA8", capacity: 45, type: "THEORY" } }));
        rooms.push(await prisma.room.create({ data: { id: `ROOM_L40${i}`, name: `Lab.${400 + i}`, building: "HA9", capacity: 40, type: "PRACTICE" } }));
    }

    // --- 3. TẠO KHOA & NGÀNH ---
    console.log("➤ Khởi tạo Khoa & Ngành đào tạo...");
    const facultyIT = await prisma.faculty.create({
        data: {
            id: "FAC_CNTT", code: "CNTT", name: "Khoa Công nghệ Thông tin", deanName: "PGS.TS Nguyễn Văn IT",
            majors: {
                create: [
                    { id: "MAJ_KTPM", code: "KTPM", name: "Kỹ thuật phần mềm", totalCreditsRequired: 150 },
                    { id: "MAJ_MMT", code: "MMT", name: "Mạng máy tính & TT", totalCreditsRequired: 150 }
                ]
            },
        }, include: { majors: true },
    });

    const facultyEco = await prisma.faculty.create({
        data: {
            id: "FAC_KT", code: "KT", name: "Khoa Kinh tế", deanName: "TS. Trần Thị Kinh Tế",
            majors: {
                create: [
                    { id: "MAJ_QTKD", code: "QTKD", name: "Quản trị kinh doanh", totalCreditsRequired: 135 },
                    { id: "MAJ_KTK", code: "KTK", name: "Kế toán", totalCreditsRequired: 135 }
                ]
            },
        }, include: { majors: true },
    });

    const itMajorId = "MAJ_KTPM";
    const ecoMajorId = "MAJ_QTKD";

    // --- 4. TẠO MÔN HỌC & ĐIỀU KIỆN TIÊN QUYẾT ---
    const subjects = [
        await prisma.subject.create({ data: { id: "SUB_IT01", code: "IT01", name: "Lập trình C/C++", credits: 3, majorId: itMajorId, theoryCredits: 2, practiceCredits: 1, department: "Bộ môn Cơ sở", isMandatory: true } }),
        await prisma.subject.create({ data: { id: "SUB_IT02", code: "IT02", name: "Cấu trúc dữ liệu và giải thuật", credits: 4, majorId: itMajorId, theoryCredits: 3, practiceCredits: 1, department: "Bộ môn Hệ thống", isMandatory: true } }),
        await prisma.subject.create({ data: { id: "SUB_IT03", code: "IT03", name: "Toán rời rạc", credits: 2, majorId: itMajorId, theoryCredits: 2, practiceCredits: 0, department: "Bộ môn Cơ sở", isMandatory: true } }),
        await prisma.subject.create({ data: { id: "SUB_ECO01", code: "ECO01", name: "Kinh tế vi mô", credits: 3, majorId: ecoMajorId, theoryCredits: 3, practiceCredits: 0, department: "Bộ môn Kinh tế", isMandatory: true } }),
        await prisma.subject.create({ data: { id: "SUB_ECO02", code: "ECO02", name: "Marketing căn bản", credits: 3, majorId: ecoMajorId, theoryCredits: 3, practiceCredits: 0, department: "Bộ môn QTKD", isMandatory: true } }),
    ];

    await prisma.prerequisite.create({
        data: { id: "PRE_IT02_IT01", subjectId: "SUB_IT02", prerequisiteId: "SUB_IT01", type: "BẮT BUỘC" }
    });

    // --- 5. TẠO GIẢNG VIÊN (MÃ 11 SỐ) ---
    console.log("➤ Khởi tạo Đội ngũ Giảng viên...");
    const lecturers = [];
    for (let i = 1; i <= 6; i++) {
        const isIT = i <= 3;
        const code = `3000000000${i}`; // Giảng viên bắt đầu bằng số 3
        const fullName = `${getEl(lastNames, i)} ${getEl(middleNamesMale, i)} ${getEl(firstNamesMale, i)}`;

        const user = await prisma.user.create({
            data: {
                id: `USR_${code}`, username: code, email: `gv${code}@uneti.edu.vn`, passwordHash: defaultPassword, role: "LECTURER",
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
            },
        });

        const lect = await prisma.lecturer.create({
            data: {
                id: `LEC_${code}`, userId: user.id, facultyId: isIT ? facultyIT.id : facultyEco.id, lectureCode: code,
                fullName: fullName, degree: getEl(["Thạc sĩ", "Tiến sĩ", "PGS.TS"], i),
                phone: `098${i.toString().padStart(7, '0')}` // SĐT quy tắc
            },
        });
        lecturers.push(lect);
    }

    // --- 6. TẠO LỚP HÀNH CHÍNH & 100 SINH VIÊN (MÃ 11 SỐ QUY TẮC) ---
    console.log("➤ Khởi tạo Lớp danh nghĩa & Hồ sơ Sinh viên...");

    const classConfigs = [
        { code: "DHTI15A1", majorId: itMajorId, cohort: "K15", year: 21, majorCode: "103" },
        { code: "DHTI16A4", majorId: itMajorId, cohort: "K16", year: 22, majorCode: "103" }, // Lớp A4, Khóa 16 CNTT
        { code: "DHTI17A7", majorId: itMajorId, cohort: "K17", year: 23, majorCode: "103" }, // Lớp A7, Khóa 17 CNTT
        { code: "DHKQ15A2", majorId: ecoMajorId, cohort: "K15", year: 21, majorCode: "205" },
        { code: "DHKQ16A1", majorId: ecoMajorId, cohort: "K16", year: 22, majorCode: "205" },
    ];

    const allStudents = [];
    const studentSeqMap: Record<string, number> = {};

    for (let classIndex = 0; classIndex < classConfigs.length; classIndex++) {
        const config = classConfigs[classIndex];
        const adminClassId = `ACLASS_${config.code}`;
        const adminClass = await prisma.adminClass.create({
            data: { id: adminClassId, code: config.code, name: `Lớp ${config.code}`, majorId: config.majorId, cohort: config.cohort, advisorId: lecturers[classIndex % 6].id },
        });

        for (let i = 1; i <= 20; i++) {
            // Quy tắc sinh ID 11 số của SV: [Năm 2 số] + [Mã Ngành 3 số] + [Hệ ĐH 1] + [Số thứ tự 5 số]
            // VD: 22103100001
            const prefix = `${config.year}${config.majorCode}1`;
            const currentSeq = studentSeqMap[prefix] || 1;
            studentSeqMap[prefix] = currentSeq + 1;

            const svCode = `${prefix}${currentSeq.toString().padStart(5, '0')}`;

            const isMale = currentSeq % 2 !== 0; // Quy tắc xen kẽ Nam/Nữ
            const firstName = isMale ? getEl(firstNamesMale, currentSeq) : getEl(firstNamesFemale, currentSeq);
            const middleName = isMale ? getEl(middleNamesMale, currentSeq) : getEl(middleNamesFemale, currentSeq);
            const lastName = getEl(lastNames, currentSeq);
            const fullName = `${lastName} ${middleName} ${firstName}`;
            const birthYear = parseInt(`20${config.year}`, 10) - 18; // Tính năm sinh

            // Quy tắc sinh mã CCCD (Mã Tỉnh 001 + Giới Tính + Năm Sinh + Sequence)
            const cccd = `001${isMale ? '2' : '3'}${config.year}${currentSeq.toString().padStart(6, '0')}`;
            // Quy tắc sinh SĐT (09 + Mã Ngành + Sequence)
            const phone = `09${config.majorCode}${currentSeq.toString().padStart(5, '0')}`;

            const user = await prisma.user.create({
                data: {
                    id: `USR_${svCode}`, username: svCode, email: `${svCode}@uneti.edu.vn`, passwordHash: defaultPassword, role: "STUDENT",
                    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=random`, lastLogin: new Date()
                },
            });

            const student = await prisma.student.create({
                data: {
                    id: `STD_${svCode}`, userId: user.id, studentCode: svCode, fullName: fullName, dob: new Date(birthYear, 8, 5), // Sinh ngày 5/9 cố định
                    gender: isMale ? "Nam" : "Nữ", phone: phone, address: `Thành phố ${getEl(provinces, currentSeq)}, Việt Nam`,
                    citizenId: cccd, emailPersonal: `${removeAccents(firstName).toLowerCase()}${svCode}@gmail.com`,
                    majorId: config.majorId, adminClassId: adminClass.id, status: "ACTIVE",
                    gpa: 0.0, cpa: 0.0, totalEarnedCredits: 0
                },
            });
            // Gắn thuộc tính `seq` để làm quy tắc điểm số phía dưới
            allStudents.push({ ...student, adminClassCode: config.code, seq: currentSeq });
        }
    }

    // --- 7. MỞ LỚP, XẾP LỊCH, GHI DANH & QUẢN LÝ TÀI CHÍNH ---
    console.log("➤ Tự động Xếp lịch, Ghi danh, Điểm danh, Tính điểm & Xuất hóa đơn học phí...");

    const tuitionPricePerCredit = 350000;

    for (let i = 0; i < classConfigs.length; i++) {
        const aCode = classConfigs[i].code;
        const isITClass = aCode.includes("DHTI");
        const studentsInClass = allStudents.filter(s => s.adminClassCode === aCode);
        const classSubjects = isITClass ? subjects.filter(s => s.code.startsWith("IT")) : subjects.filter(s => s.code.startsWith("ECO"));

        const totalCreditsThisSem = classSubjects.reduce((sum, sub) => sum + sub.credits, 0);
        const totalTuitionFee = totalCreditsThisSem * tuitionPricePerCredit;

        // Xử lý Học phí & Giao dịch
        for (const sv of studentsInClass) {
            const currentSeq = (sv as any).seq;
            // QUY TẮC: Cứ bạn nào có sequence chia hết cho 10 thì sẽ NỢ HỌC PHÍ (Tức là 1 lớp 20 người sẽ có 2 người nợ)
            const hasPaid = currentSeq % 10 !== 0;
            const feeId = `FEE_${sv.studentCode}_${semester.code}`;

            const fee = await prisma.tuitionFee.create({
                data: {
                    id: feeId, studentId: sv.id, semesterId: semester.id, totalAmount: totalTuitionFee,
                    paidAmount: hasPaid ? totalTuitionFee : 0, status: hasPaid ? "PAID" : "DEBT", dueDate: new Date("2025-10-15")
                }
            });

            if (hasPaid) {
                // QUY TẮC TẠO MÃ GIAO DỊCH: TXN_[Mã Học Kỳ]_[Mã Sinh Viên]
                const txnCode = `TXN_${semester.code}_${sv.studentCode}`;
                await prisma.tuitionTransaction.create({
                    data: {
                        id: txnCode, tuitionFeeId: fee.id, amount: totalTuitionFee, paymentMethod: getEl(["BANKING", "MOMO", "VNPAY", "CASH"], currentSeq),
                        transactionDate: new Date("2025-09-10"), transactionCode: txnCode
                    }
                });
            }
            (sv as any).isBannedDueToFinance = !hasPaid;
        }

        // Xếp Lịch, Điểm Danh & Nhập Điểm
        for (let j = 0; j < classSubjects.length; j++) {
            const subject = classSubjects[j];
            const lecturerIndex = isITClass ? (i % 3) : (3 + (i % 3));
            const courseCode = `${subject.code}_${aCode}`;

            const courseClass = await prisma.courseClass.create({
                data: {
                    id: `CCLASS_${courseCode}`, code: courseCode, name: `${subject.name} - ${aCode}`, subjectId: subject.id,
                    semesterId: semester.id, lecturerId: lecturers[lecturerIndex].id, maxSlots: 40, currentSlots: studentsInClass.length, status: "LOCKED",
                    tuitionMultiplier: 1.0, adminClassCode: aCode
                }
            });

            await prisma.classSchedule.create({
                data: {
                    id: `SCH_${courseCode}`, courseClassId: courseClass.id, roomId: rooms[(i + j) % rooms.length].id,
                    dayOfWeek: (j % 6) + 2, shift: (i % 3) * 2 + 1, type: "THEORY" // Xếp theo quy tắc để không trùng
                }
            });

            for (const sv of studentsInClass) {
                const enrId = `ENR_${sv.studentCode}_${courseCode}`;
                const enrollment = await prisma.enrollment.create({
                    data: { id: enrId, studentId: sv.id, courseClassId: courseClass.id, status: "SUCCESS", tuitionFee: subject.credits * tuitionPricePerCredit, isEligibleForExam: true }
                });

                const currentSeq = (sv as any).seq;

                // QUY TẮC ĐIỂM DANH: Số buổi vắng là chuỗi lặp 0, 1, 2, 3, 4 (chia lấy dư cho 5)
                const absentCount = currentSeq % 5;

                for (let session = 1; session <= 15; session++) {
                    const isAbsent = session <= absentCount; // Những buổi đầu sẽ là buổi vắng nếu absentCount > 0
                    await prisma.attendance.create({
                        data: { id: `ATT_${enrId}_S${session.toString().padStart(2, '0')}`, enrollmentId: enrollment.id, date: new Date(2025, 8, 5 + session * 7), status: isAbsent ? "ABSENT" : "PRESENT" }
                    });
                }

                // Xét điều kiện cấm thi
                let isBanned = false;
                let banReason = "";
                if ((sv as any).isBannedDueToFinance) { isBanned = true; banReason += "Nợ học phí. "; }
                if (absentCount > 3) { isBanned = true; banReason += "Vắng quá 20% số buổi. "; }

                if (isBanned) {
                    await prisma.enrollment.update({
                        where: { id: enrollment.id },
                        data: { isEligibleForExam: false, banReason: banReason.trim() }
                    });
                }

                // QUY TẮC TÍNH ĐIỂM: Không random, tính toán dựa vào sequence
                const attScore = isBanned ? (currentSeq % 5) : (10 - absentCount);
                const midScore = isBanned ? 0 : 5 + (currentSeq % 5); // Cột điểm từ 5 đến 9
                const finScore = isBanned ? 0 : 5 + (currentSeq % 5) + 0.5; // Cột điểm từ 5.5 đến 9.5

                const total10 = parseFloat((attScore * 0.1 + midScore * 0.3 + finScore * 0.6).toFixed(1));

                let total4 = 0, letter = 'F', isPassed = false;
                if (total10 >= 8.5) { total4 = 4.0; letter = 'A'; isPassed = true; }
                else if (total10 >= 8.0) { total4 = 3.5; letter = 'B+'; isPassed = true; }
                else if (total10 >= 7.0) { total4 = 3.0; letter = 'B'; isPassed = true; }
                else if (total10 >= 6.5) { total4 = 2.5; letter = 'C+'; isPassed = true; }
                else if (total10 >= 5.5) { total4 = 2.0; letter = 'C'; isPassed = true; }
                else if (total10 >= 5.0) { total4 = 1.5; letter = 'D+'; isPassed = true; }
                else if (total10 >= 4.0) { total4 = 1.0; letter = 'D'; isPassed = true; }

                // Tính điểm hệ 4 và hệ chữ

                await prisma.grade.create({
                    data: {
                        id: `GRD_${sv.studentCode}_${courseCode}`, studentId: sv.id, courseClassId: courseClass.id, subjectId: subject.id,
                        attendanceScore: attScore, midtermScore: midScore, finalScore: finScore,
                        totalScore10: total10, totalScore4: total4, letterGrade: letter, isPassed: isPassed
                    }
                });
            }
        }
    }

    // --- 8. TÍNH TOÁN LẠI GPA VÀ CPA CHUẨN XÁC ---
    console.log("➤ Đang cập nhật GPA (Học kỳ), CPA (Tích lũy) và Tổng tín chỉ cho sinh viên...");

    for (const student of allStudents) {
        const allGrades = await prisma.grade.findMany({
            where: { studentId: student.id },
            include: { subject: true, courseClass: true }
        });

        // Tính GPA học kỳ này
        let semCreditsAttempted = 0;
        let semTotalPoints = 0;
        const currentSemesterGrades = allGrades.filter(g => g.courseClass.semesterId === semester.id);

        for (const grade of currentSemesterGrades) {
            semCreditsAttempted += grade.subject.credits;
            semTotalPoints += (grade.totalScore4! * grade.subject.credits);
        }
        const calculatedGPA = semCreditsAttempted > 0 ? parseFloat((semTotalPoints / semCreditsAttempted).toFixed(2)) : 0;

        // Tính CPA toàn khóa
        let totalEarnedCredits = 0;
        let totalCreditsAttempted = 0;
        let totalPoints = 0;

        for (const grade of allGrades) {
            totalCreditsAttempted += grade.subject.credits;
            totalPoints += (grade.totalScore4! * grade.subject.credits);
            if (grade.isPassed) totalEarnedCredits += grade.subject.credits;
        }

        const calculatedCPA = totalCreditsAttempted > 0 ? parseFloat((totalPoints / totalCreditsAttempted).toFixed(2)) : 0;

        await prisma.student.update({
            where: { id: student.id },
            data: { gpa: calculatedGPA, cpa: calculatedCPA, totalEarnedCredits: totalEarnedCredits }
        });
    }

    console.log("==========================================================");
    console.log("🎉 SEEDING HOÀN TẤT! Dữ liệu 11 số & Các mã số đều tuyệt đối tuân thủ quy tắc nghiệp vụ. All manual IDs!");
    console.log("🔐 Tài khoản Test Hệ Thống:");
    console.log(`   - Admin Hệ Thống    : ${adminCode} / 123456 (hoặc Admin ID: USR_${adminCode})`);
    console.log(`   - Phòng Đào Tạo     : ${staffCodes[0]} / 123456 (hoặc Admin ID: USR_${staffCodes[0]})`);
    console.log(`   - Giảng viên 1      : ${lecturers[0].lectureCode} / 123456`);
    console.log(`   - Sinh viên (K16)   : ${allStudents.find(s => s.adminClassCode === 'DHTI16A4')?.studentCode} / 123456`);
    console.log("==========================================================");
}

main()
    .catch((e) => {
        console.error("❌ Lỗi khi seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });