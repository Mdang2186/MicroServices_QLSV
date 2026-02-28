import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- BỘ DỮ LIỆU TỪ ĐIỂN ĐỂ TẠO THÔNG TIN RANDOM ---
const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const middleNamesMale = ["Văn", "Hữu", "Đức", "Công", "Quang", "Minh", "Hoàng", "Thế", "Đình", "Xuân", "Mạnh", "Tuấn", "Trọng", "Phú"];
const middleNamesFemale = ["Thị", "Ngọc", "Thu", "Phương", "Mai", "Thanh", "Bích", "Hồng", "Kim", "Lan", "Diễm", "Kiều", "Thúy"];
const firstNamesMale = ["Anh", "Bảo", "Cường", "Dũng", "Dương", "Đạt", "Hải", "Hiếu", "Huy", "Khang", "Khoa", "Kiên", "Lâm", "Long", "Nam", "Nghĩa", "Phát", "Phúc", "Quân", "Thắng", "Thành", "Thiên", "Thịnh", "Trung", "Tuấn", "Việt"];
const firstNamesFemale = ["An", "Anh", "Châu", "Chi", "Diệp", "Hà", "Hân", "Hoa", "Huyền", "Linh", "Ly", "Mai", "Ngân", "Nhi", "Nhung", "Oanh", "Quyên", "Quỳnh", "Trâm", "Trang", "Tú", "Uyên", "Vy", "Yến"];
const provinces = ["Hà Nội", "Hà Nam", "Nam Định", "Thái Bình", "Ninh Bình", "Hưng Yên", "Hải Dương", "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Bắc Giang", "Phú Thọ", "Vĩnh Phúc", "Thái Nguyên", "Thanh Hóa", "Nghệ An", "Hà Tĩnh"];

// --- HÀM TIỆN ÍCH RANDOM ---
const randomEl = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPhone = () => `0${randomEl(['9', '3', '8', '7'])}${randomInt(10000000, 99999999)}`;
const randomCCCD = () => `00120${randomInt(1000000, 9999999)}`;
const randomDate = (startYear: number, endYear: number) => {
    const d = new Date(randomInt(startYear, endYear), randomInt(0, 11), randomInt(1, 28));
    return d;
};
const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

async function main() {
    console.log("🚀 Bắt đầu dọn dẹp dữ liệu cũ (Clean up)...");
    await prisma.tuitionTransaction.deleteMany();
    await prisma.tuitionFee.deleteMany();
    await prisma.grade.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.classSchedule.deleteMany();
    await prisma.courseClass.deleteMany();
    await prisma.prerequisite.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.adminClass.deleteMany();
    await prisma.major.deleteMany();
    await prisma.lecturer.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.user.deleteMany();

    console.log("🌱 Bắt đầu gieo hạt dữ liệu chi tiết theo mô hình UNETI...");

    const defaultPassword = await bcrypt.hash("123456", 10);

    // 1. TẠO TÀI KHOẢN ADMIN
    await prisma.user.create({
        data: {
            username: "admin_uneti",
            email: "admin@uneti.edu.vn",
            passwordHash: defaultPassword,
            role: "ADMIN",
            avatarUrl: "https://ui-avatars.com/api/?name=Admin+Uneti&background=random",
            isActive: true,
            lastLogin: new Date(),
        },
    });

    // 2. TẠO HỌC KỲ
    const semester = await prisma.semester.create({
        data: {
            code: "HK1_2025_2026",
            name: "Học kỳ 1 Năm học 2025-2026",
            startDate: new Date("2025-09-05"),
            endDate: new Date("2026-01-15"),
            isRegistering: false,
        },
    });

    // 3. TẠO KHOA & NGÀNH
    const facultyIT = await prisma.faculty.create({
        data: {
            code: "CNTT", name: "Khoa Công nghệ Thông tin", deanName: "PGS.TS Nguyễn Văn IT",
            majors: { create: [{ code: "KTPM", name: "Kỹ thuật phần mềm" }, { code: "MMT", name: "Mạng máy tính & TT" }] },
        }, include: { majors: true },
    });

    const facultyEco = await prisma.faculty.create({
        data: {
            code: "KT", name: "Khoa Kinh tế", deanName: "TS. Trần Thị Kinh Tế",
            majors: { create: [{ code: "QTKD", name: "Quản trị kinh doanh" }, { code: "KTK", name: "Kế toán" }] },
        }, include: { majors: true },
    });

    // 4. TẠO MÔN HỌC (TÍN CHỈ KHÁC NHAU)
    const itMajorId = facultyIT.majors.find(m => m.code === "KTPM")!.id;
    const ecoMajorId = facultyEco.majors.find(m => m.code === "QTKD")!.id;

    const subjects = [
        await prisma.subject.create({ data: { code: "IT01", name: "Lập trình C/C++", credits: 3, majorId: itMajorId, theoryHours: 30, practiceHours: 15, description: "Cơ sở lập trình" } }),
        await prisma.subject.create({ data: { code: "IT02", name: "Cấu trúc dữ liệu và giải thuật", credits: 4, majorId: itMajorId, theoryHours: 45, practiceHours: 15, description: "Nền tảng thuật toán" } }),
        await prisma.subject.create({ data: { code: "IT03", name: "Toán rời rạc", credits: 2, majorId: itMajorId, theoryHours: 30, practiceHours: 0, description: "Toán học cho CNTT" } }),
        await prisma.subject.create({ data: { code: "ECO01", name: "Kinh tế vi mô", credits: 3, majorId: ecoMajorId, theoryHours: 45, practiceHours: 0, description: "Nhập môn kinh tế" } }),
        await prisma.subject.create({ data: { code: "ECO02", name: "Marketing căn bản", credits: 3, majorId: ecoMajorId, theoryHours: 45, practiceHours: 0, description: "Kiến thức Marketing" } }),
    ];

    // 5. TẠO GIẢNG VIÊN ĐẦY ĐỦ THÔNG TIN
    const lecturers = [];
    for (let i = 1; i <= 6; i++) {
        const isIT = i <= 3;
        const code = `GV${isIT ? 'IT' : 'ECO'}0${i}`;
        const lastName = randomEl(lastNames);
        const middleName = randomEl(middleNamesMale);
        const firstName = randomEl(firstNamesMale);
        const fullName = `${lastName} ${middleName} ${firstName}`;

        const user = await prisma.user.create({
            data: {
                username: code,
                email: `${code.toLowerCase()}@uneti.edu.vn`,
                passwordHash: defaultPassword,
                role: "LECTURER",
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
            },
        });

        const lect = await prisma.lecturer.create({
            data: {
                userId: user.id, facultyId: isIT ? facultyIT.id : facultyEco.id, lectureCode: code,
                fullName: fullName, degree: randomEl(["Thạc sĩ", "Tiến sĩ", "PGS.TS"]), phone: randomPhone()
            },
        });
        lecturers.push(lect);
    }

    // 6. TẠO LỚP HÀNH CHÍNH & 160 SINH VIÊN (DỮ LIỆU CỰC KỲ CHI TIẾT)
    console.log("Đang tạo Lớp hành chính và 160 Sinh viên với thông tin cá nhân đầy đủ...");
    const classConfigs = [
        { code: "DHTI13A1", majorId: itMajorId, cohort: "K13", dobYear: 2003, minCredits: 90, maxCredits: 110 },
        { code: "DHTI14A1", majorId: itMajorId, cohort: "K14", dobYear: 2004, minCredits: 50, maxCredits: 80 },
        { code: "DHTI15A1", majorId: itMajorId, cohort: "K15", dobYear: 2005, minCredits: 20, maxCredits: 40 },
        { code: "DHTI16A1", majorId: itMajorId, cohort: "K16", dobYear: 2006, minCredits: 0, maxCredits: 15 },
        { code: "DHKQ13A1", majorId: ecoMajorId, cohort: "K13", dobYear: 2003, minCredits: 90, maxCredits: 110 },
        { code: "DHKQ14A1", majorId: ecoMajorId, cohort: "K14", dobYear: 2004, minCredits: 50, maxCredits: 80 },
        { code: "DHKQ15A1", majorId: ecoMajorId, cohort: "K15", dobYear: 2005, minCredits: 20, maxCredits: 40 },
        { code: "DHKQ16A1", majorId: ecoMajorId, cohort: "K16", dobYear: 2006, minCredits: 0, maxCredits: 15 },
    ];

    const allStudents = [];

    for (const [classIndex, config] of classConfigs.entries()) {
        const adminClass = await prisma.adminClass.create({
            data: { code: config.code, name: `Lớp ${config.code}`, majorId: config.majorId, cohort: config.cohort, advisorId: lecturers[classIndex % 6].id },
        });

        for (let i = 1; i <= 20; i++) {
            const svCode = `${config.code}${i.toString().padStart(3, '0')}`;
            const isMale = Math.random() > 0.4; // 60% Nam, 40% Nữ
            const lastName = randomEl(lastNames);
            const middleName = isMale ? randomEl(middleNamesMale) : randomEl(middleNamesFemale);
            const firstName = isMale ? randomEl(firstNamesMale) : randomEl(firstNamesFemale);
            const fullName = `${lastName} ${middleName} ${firstName}`;
            const emailPers = `${removeAccents(firstName).toLowerCase()}${svCode.toLowerCase()}@gmail.com`;

            // Random GPA & Credits cho từng sinh viên tùy theo Khóa
            const randomGpa = parseFloat((Math.random() * (4.0 - 2.0) + 2.0).toFixed(2));
            const randomCredits = randomInt(config.minCredits, config.maxCredits);

            const user = await prisma.user.create({
                data: {
                    username: svCode, email: `${svCode.toLowerCase()}@uneti.edu.vn`, passwordHash: defaultPassword, role: "STUDENT",
                    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=random`,
                    lastLogin: randomDate(2025, 2026)
                },
            });

            const student = await prisma.student.create({
                data: {
                    userId: user.id, studentCode: svCode, fullName: fullName, dob: randomDate(config.dobYear, config.dobYear),
                    gender: isMale ? "Nam" : "Nữ", phone: randomPhone(), address: `Thành phố ${randomEl(provinces)}, Việt Nam`,
                    citizenId: randomCCCD(), emailPersonal: emailPers, majorId: config.majorId, adminClassId: adminClass.id,
                    status: "ACTIVE", gpa: randomGpa, totalCredits: randomCredits
                },
            });
            allStudents.push({ ...student, adminClassCode: config.code, isIT: config.code.includes("DHTI") });
        }
    }

    // 7. XẾP LỊCH UNETI VÀ TỰ ĐỘNG ÉP ĐIỂM + HỌC PHÍ THỰC TẾ
    console.log("Đang tạo Lớp học phần, Thời khóa biểu, Điểm số và Hóa đơn học phí...");

    const tuitionPricePerCredit = 350000; // 350k / 1 tín chỉ

    for (let i = 0; i < classConfigs.length; i++) {
        const aCode = classConfigs[i].code;
        const isITClass = aCode.includes("DHTI");
        const studentsInClass = allStudents.filter(s => s.adminClassCode === aCode);
        const classSubjects = isITClass ? subjects.filter(s => s.code.startsWith("IT")) : subjects.filter(s => s.code.startsWith("ECO"));

        for (let j = 0; j < classSubjects.length; j++) {
            const subject = classSubjects[j];
            const lecturerIndex = isITClass ? (i % 3) : (3 + (i % 3));

            // Xếp lịch không trùng
            const dayOfWeek = j + 2;
            const shiftStart = (i % 3) * 3 + 1;
            const shiftEnd = shiftStart + 2;

            // 7.1 Mở Lớp Học Phần
            const courseClass = await prisma.courseClass.create({
                data: {
                    code: `${subject.code}_${aCode}`, name: `${subject.name} - ${aCode}`, subjectId: subject.id,
                    semesterId: semester.id, lecturerId: lecturers[lecturerIndex].id, maxSlots: 40, currentSlots: 20, status: "LOCKED",
                    schedules: { create: [{ dayOfWeek, startShift: shiftStart, endShift: shiftEnd, room: `Phòng ${100 + i + j}-HA8`, type: "THEORY" }] }
                }
            });

            // 7.2 Ép Đăng ký (Enrollment) và Sinh Điểm Random (Grade)
            for (const sv of studentsInClass) {
                // Tạo Enrollment
                await prisma.enrollment.create({
                    data: { studentId: sv.id, courseClassId: courseClass.id, status: "SUCCESS", tuitionFee: subject.credits * tuitionPricePerCredit }
                });

                // Random điểm thực tế
                const attScore = randomInt(7, 10);
                const midScore = randomInt(4, 10);
                const finScore = randomInt(4, 9) + Math.random(); // Điểm lẻ
                const total10 = parseFloat((attScore * 0.1 + midScore * 0.3 + finScore * 0.6).toFixed(1));

                let total4 = 0, letter = 'F', isPassed = false;
                if (total10 >= 8.5) { total4 = 4.0; letter = 'A'; isPassed = true; }
                else if (total10 >= 8.0) { total4 = 3.5; letter = 'B+'; isPassed = true; }
                else if (total10 >= 7.0) { total4 = 3.0; letter = 'B'; isPassed = true; }
                else if (total10 >= 6.5) { total4 = 2.5; letter = 'C+'; isPassed = true; }
                else if (total10 >= 5.5) { total4 = 2.0; letter = 'C'; isPassed = true; }
                else if (total10 >= 5.0) { total4 = 1.5; letter = 'D+'; isPassed = true; }
                else if (total10 >= 4.0) { total4 = 1.0; letter = 'D'; isPassed = true; }

                await prisma.grade.create({
                    data: {
                        studentId: sv.id, courseClassId: courseClass.id, subjectId: subject.id,
                        attendanceScore: attScore, midtermScore: midScore, finalScore: parseFloat(finScore.toFixed(1)),
                        totalScore10: total10, totalScore4: total4, letterGrade: letter, isPassed: isPassed
                    }
                });
            }
        }

        // 7.3 Tạo Hóa đơn học phí Tổng cho học kỳ (TuitionFee & Transaction)
        const totalCreditsPerClass = classSubjects.reduce((sum, sub) => sum + sub.credits, 0);
        const totalAmount = totalCreditsPerClass * tuitionPricePerCredit;

        for (const sv of studentsInClass) {
            // Random: 80% sinh viên đã nộp học phí, 20% nợ
            const hasPaid = Math.random() > 0.2;
            const paidAmount = hasPaid ? totalAmount : 0;

            const fee = await prisma.tuitionFee.create({
                data: {
                    studentId: sv.id, semesterId: semester.id, totalAmount: totalAmount,
                    paidAmount: paidAmount, isCompleted: hasPaid, deadline: new Date("2025-10-15")
                }
            });

            // Nếu đã nộp tiền thì tạo giao dịch (Transaction)
            if (hasPaid) {
                await prisma.tuitionTransaction.create({
                    data: {
                        tuitionFeeId: fee.id, amount: totalAmount, paymentMethod: randomEl(["BANKING", "MOMO", "VNPAY", "CASH"]),
                        transactionDate: randomDate(2025, 2025), transactionCode: `TXN${randomInt(100000, 999999)}`
                    }
                });
            }
        }
    }

    console.log("🎉 Seeding hoàn tất! Dữ liệu cực kỳ đầy đủ, chân thực, 100% cột đã được lấp đầy.");
}

main()
    .catch((e) => {
        console.error("❌ Lỗi khi seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });