# 🎓 Hệ thống Quản lý Sinh viên (University Management System)

[![GitHub](https://img.shields.io/badge/GitHub-Mdang2186/MicroServices_QLSV-blue?logo=github)](https://github.com/Mdang2186/MicroServices_QLSV)

Hệ thống Quản lý sinh viên là một nền tảng quản trị giáo dục hiện đại được xây dựng trên kiến trúc **Microservices**, sử dụng mô hình **Monorepo** (Turborepo) để tối ưu hóa việc phát triển và triển khai.

Dự án tập trung vào việc giải quyết các bài toán nghiệp vụ phức tạp, đặc biệt là **Đăng ký Học phần** trong môi trường có lưu lượng truy cập cao, đảm bảo tính nhất quán dữ liệu bằng cơ chế Distributed Locking.

---

## 🛡️ Hệ Thống Phân Quyền & Truy Cập (IAM)

Hệ thống sử dụng cơ chế **Role-Based Access Control (RBAC)** với 4 phân quyền chính:

| Vai Trò | Cổng Truy Cập | Chức Năng Chính |
|---|---|---|
| **SUPER_ADMIN** | Web Admin | Toàn quyền kiểm soát hệ thống, quản lý tài khoản Staff và cấu hình hệ thống. |
| **ACADEMIC_STAFF** | Web Admin | Quản lý danh mục đào tạo, xếp lịch học, quản lý lớp hành chính và nhập liệu học vụ. |
| **LECTURER** | Web Admin | Xem lịch dạy, quản lý danh sách sinh viên lớp học phần và thực hiện nhập điểm. |
| **STUDENT** | Web Portal | Đăng ký học phần, xem thời khóa biểu, bảng điểm và quản lý hồ sơ cá nhân. |

---

## 🚀 Các Tính Năng Nổi Bật

### 👨‍🎓 Cổng Sinh viên (Web Portal) - `:4000`
- **Dashboard Học tập**: Biểu đồ tiến độ học tập, thống kê CPA/GPA và tín chỉ tích lũy.
- **Đăng ký Học phần**: Logic xử lý mạnh mẽ, cập nhật slot realtime, chống Overbooking bằng **Redis Cluster Lock**.
- **Lịch Học**: Tích hợp Weekly Calendar trực quan, hỗ trợ xem lịch học và lịch thi.
- **Tài chính**: Tra cứu công nợ, lịch sử thanh toán học phí và các loại phí bảo hiểm.
- **Hồ sơ 360**: Quản lý thông tin nhân thân, quan hệ gia đình và thông tin học vấn chi tiết.

### 🛡️ Cổng Quản lý (Web Admin) - `:4005`
- **Quản lý Đào tạo**: Cấu trúc Khoa -> Ngành -> Môn học -> Chương trình đào tạo.
- **Xếp lịch thông minh**: Thuật toán kiểm tra trùng lịch phòng học và giảng viên khi khởi tạo lớp học phần.
- **Quản lý Học vụ**: Nhập điểm (hệ 10, quy đổi hệ 4/chữ), xét tư vấn học tập và khen thưởng/kỷ luật.
- **Báo cáo & Thống kê**: Xuất dữ liệu sinh viên, bảng điểm và báo cáo doanh thu học phí.

---

## 🏗️ Kiến Trúc Hệ Thống (Microservices)

Hệ thống được chia thành các dịch vụ độc lập giao tiếp qua giao thức HTTP/gRPC và được điều phối bởi API Gateway.

### 📦 Các Microservices chính:
1.  **API Gateway (`:3000`)**: Điểm tiếp nhận duy nhất, xử lý định tuyến (Routing) và gộp Request.
2.  **Auth Service (`:3001`)**: Xử lý định danh (Identity), cấp phát JWT và kiểm tra quyền hạn (Guard).
3.  **Student Service (`:3002`)**: Lưu trữ và quản lý dữ liệu liên quan đến hồ sơ và tài chính sinh viên.
4.  **Course Service (`:3003`)**: Quản lý nghiệp vụ đào tạo, danh mục môn học và tổ chức lớp học.
5.  **Enrollment Svc (`:3004`)**: Dịch vụ lõi xử lý đăng ký môn học, tích hợp Redis để đảm bảo hiệu năng cao.
6.  **Grade Service (`:3005`)**: Chuyên biệt cho việc lưu trữ, tính toán và bảo mật bảng điểm.

---

## 🛠️ Công Nghệ & Luồng Dữ Liệu

- **Backend**: NestJS (v10+), Microservices (TCP/HTTP).
- **Frontend**: Next.js 14 (Student) & Next.js 16 (Admin - React 19).
- **ORM**: Prisma với Microsoft SQL Server.
- **Cơ chế Locking**: Distributed Lock bằng Redis để giải quyết bài toán `Race Condition` khi nhiều sinh viên đăng ký cùng 1 slot cuối cùng.
- **Styling**: Tailwind CSS (v3/v4), Framer Motion cho micro-animations.

---

## ⚙️ Hướng Dẫn Cài Đặt (Local Development)

### 1. Chuẩn bị môi trường
- Node.js LTS (>= 20.x)
- Docker Desktop
- SQL Server Management Studio (tùy chọn)

### 2. Thiết lập dự án
1.  **Cài đặt dependencies**:
    ```bash
    npm install
    ```
2.  **Khởi động hạ tầng (Database & Redis)**:
    ```bash
    docker-compose up -d
    ```
3.  **Cấu hình .env**:
    ```env
    DATABASE_URL="sqlserver://localhost:1433;database=student_db;user=SA;password=YourPassword;trustServerCertificate=true"
    REDIS_URL="redis://localhost:6379"
    JWT_SECRET="sms_secret_key"
    ```
4.  **Đồng bộ dữ liệu**:
    ```bash
    npx prisma db push
    npx prisma db seed
    ```
5.  **Chạy hệ thống**:
    ```bash
    npm run dev
    ```

---

## 📝 Quy tắc Phát triển
- **Shared Packages**: Các DTO, Type và Utils dùng chung được đặt trong `packages/shared-dto` và `packages/shared-utils`.
- **Database Schema**: Luôn cập nhật tại `packages/database/prisma/schema.prisma`. Sau khi sửa file này, chạy `npx prisma generate` để cập nhật types cho các dịch vụ.
