# TỔNG QUAN DỰ ÁN HỆ THỐNG QUẢN LÝ SINH VIÊN (MICROSERVICES)

Dự án là một hệ thống quản lý đào tạo toàn diện, được xây dựng theo kiến trúc Microservices hiện đại, tối ưu cho hiệu năng và khả năng mở rộng.

## I. Công nghệ sử dụng (Technology Stack)

### 1. Backend (Microservices)
- **Framework**: NestJS (TypeScript).
- **ORM**: Prisma (kết nối SQL Server).
- **Database**: Microsoft SQL Server.
- **Caching & Locking**: Redis (Sử dụng `ioredis` và `Redlock`).
- **Communication**: REST API (thông qua Gateway).

### 2. Frontend (Web Apps)
- **Framework**: Next.js 14+ (App Router).
- **Styling**: Tailwind CSS, CSS Modules.
- **UI Components**: Lucide React (Icons), Radix UI.
- **State Management**: React Hooks, Fetch API.

### 3. Hạ tầng (Infrastructure)
- **Containerization**: Docker, Docker Compose (cho Redis, SQL Server).
- **Orchestration**: Turborepo (Quản lý Monorepo).
- **Environment**: Multi-environment (.env).

---

## II. Các Microservices và Chức năng

### 1. `api-gateway`
- **Chức năng**: Cổng vào duy nhất của hệ thống, điều hướng (proxy) yêu cầu tới các service tương ứng.
- **Bảo mật**: Xử lý CORS và định tuyến tập trung.

### 2. `auth-service`
- **Chức năng**: Quản lý người dùng, phân quyền (RBAC).
- **Vai trò**: Admin, Academic Staff (Cán bộ đào tạo), Lecturer (Giảng viên), Student (Sinh viên).
- **Tính năng**: Đăng nhập, Đăng ký, Quên mật khẩu, Quản lý tài khoản giảng viên & sinh viên.

### 3. `course-service`
- **Chức năng**: Quản lý học liệu và tổ chức đào tạo.
- **Dữ liệu**: Khoa (Faculty), Bộ môn (Department), Môn học (Subject), Học kỳ (Semester), Phòng học (Room).
- **Module Xếp lịch (Staff Scheduling)**: [MỚI]
    - **Sinh lịch tự động**: Tạo hàng loạt buổi học theo mẫu tuần (Weekly Pattern) cho một khoảng thời gian tùy chỉnh.
    - **Quản lý buổi học rời rạc**: Cho phép thêm, sửa (đổi lịch), xóa từng buổi học (Học bù, nghỉ lễ, thi).
    - **Giao diện Lịch biểu (Calendar View)**: Trực quan hóa toàn bộ lịch học của lớp học phần dưới dạng lịch tháng, hỗ trợ thao tác nhanh qua Click-to-Action.

### 4. `enrollment-service` (Trọng tâm)
- **Chức năng**: Xử lý đăng ký học phần của sinh viên.
- **Logic quan trọng**:
    - Kiểm tra môn tiên quyết (Prerequisite).
    - Kiểm tra trùng lịch (Schedule Conflict).
    - Quản lý sĩ số lớp (Slot management).
    - Đồng bộ học phí tự động (Tuition Sync).

### 5. `grade-service` & `student-service`
- **Chức năng**: Quản lý điểm số, bảng điểm và thông tin hồ sơ sinh viên, lớp hành chính.
- **Quy trình tính điểm & Chuyên cần (Chuẩn UNETI)**: [MẬT ĐỘ CAO]
    - **Điểm quá trình (40%)**:
        - Chuyên cần: Tính dựa trên tổng số buổi học của toàn kỳ (lý thuyết + thực hành).
        - Kiểm tra thường xuyên (Hệ số 1): Tối thiểu 1 đầu điểm.
        - Kiểm tra định kỳ (Hệ số 2): Số đầu điểm bằng số tín chỉ của môn học.
    - **Điểm thi kết thúc (60%)**: Do Phòng đào tạo (Staff/Admin) nhập, Giảng viên chỉ được xem.
    - **Logic Cấm thi**: Tự động cảnh báo và cấm thi nếu tỷ lệ chuyên cần < 80%.

---

## III. Các Luồng Logic và Tính năng Đặc biệt

### 1. Lớp Hiệu năng & Tin cậy (Redis Performance Layer)
- **Hybrid Locking**: Khi đăng ký môn học, hệ thống ưu tiên dùng Redis Lock (Redlock) để tránh tranh chấp slot. Nếu Redis lỗi, hệ thống tự động hạ cấp xuống dùng SQL Atomic Update để đảm bảo không bao giờ bị gián đoạn.
- **Distributed Caching**: Cache các dữ liệu nặng (Danh sách môn học, phòng học) vào Redis để giảm tải cho SQL Server.

### 2. Cổng thông tin Giảng viên (Lecturer Portal)
- Thiết kế tối giản, mật độ thông tin cao.
- Xem lịch dạy tuần, điểm danh sinh viên trực tiếp.
- Xem danh sách lớp và thống kê chuyên cần thời gian thực.
- Nhập điểm quá trình (Thường xuyên, Định kỳ) với phân quyền chặt chẽ.

### 3. Module Xếp lịch cho Staff (Advanced Scheduling)
- Hỗ trợ 2 chế độ hiển thị: Danh sách (List) và Lịch biểu (Calendar).
- **Logic Đối soát**: Tự động kiểm tra trùng lịch phòng học và giảng viên khi xếp lịch.
- **Nghiệp vụ linh hoạt**: Dễ dàng dời lịch, thêm buổi học bù hoặc thi mà không làm hỏng cấu trúc mẫu tuần ban đầu.

### 4. Quy trình Đăng ký học phần (Student Enrollment Flow)
- Sinh viên chọn môn dựa trên Chương trình khung (Curriculum).
- Hệ thống kiểm tra điều kiện theo thời gian thực (Trùng lịch, hết chỗ, chưa đạt môn tiên quyết).
- Tự động tính toán học phí (Bao gồm hệ số học lại).

### 5. Thiết kế Layout (UI/UX)
- Giao diện Admin/Staff: Chuyên nghiệp, bảng dữ liệu gọn gàng.
- Giao diện Lecturer/Student: Mobile-friendly, tập trung vào nhiệm vụ chính.
- Sử dụng Glassmorphism và hiệu ứng Animate-in để tăng tính thẩm mỹ cao cấp.

---

## IV. Cấu trúc Thư mục chính
- `/apps`: Chứa các Microservices và Frontend apps.
- `/packages/database`: Chứa Prisma Schema dùng chung cho toàn dự án.
- `/packages/shared-dto`: Định nghĩa các kiểu dữ liệu và DTO dùng chung giữa Backend và Frontend.
- `docker-compose.yml`: Cấu hình chạy các dịch vụ hạ tầng.
- `start-infra.ps1`: Script PowerShell khởi động nhanh môi trường.
