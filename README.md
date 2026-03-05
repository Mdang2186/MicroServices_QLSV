# 🎓 Hệ thống Quản lý Sinh viên (University Management System)

Hệ thống Quản lý sinh viên là một nền tảng quản trị giáo dục được xây dựng dựa trên kiến trúc **Microservices** và quản lý mã nguồn theo mô hình **Monorepo** (Turborepo).

Dự án ra đời nhằm giải quyết triệt để bài toán "nút thắt cổ chai" (bottleneck) và lỗi "vượt quá sĩ số" (Race Condition / Overbooking) thường gặp trong các đợt đăng ký tín chỉ cao điểm tại các trường Đại học.

---

## 🚀 Các Tính Năng Nổi Bật (Features)

Hệ thống được thiết kế với 2 phân quyền độc lập, giao tiếp thông qua API Gateway:

### 🛡️ 1. Cổng Quản trị (Admin Portal) https://admin-qlsv-microservices.vercel.app/

- **Quản trị Danh mục**: Quản lý cấu trúc Khoa, Ngành học, Chương trình đào tạo.
- **Tổ chức Đào tạo**: Thiết lập danh sách Môn học, điều kiện Môn tiên quyết.
- **Xếp lịch thông minh (Scheduling)**: Khởi tạo Lớp học phần, phân bổ Giảng viên và Phòng học. Hệ thống tự động phát hiện và cảnh báo trùng lịch, trùng phòng.
- **Quản lý Học vụ**: Công cụ nhập điểm hàng loạt (Bulk grading), tự động tổng kết và quy đổi điểm hệ 4 / điểm chữ.

### 👨‍🎓 2. Cổng Sinh viên (Student Portal) https://qlsv-microservices.vercel.app/

- **Bảng điều khiển cá nhân**: Theo dõi tiến độ học tập, tổng tín chỉ, CPA/GPA.
- **Đăng ký Tín chỉ (Core)**: Trải nghiệm đăng ký môn học mượt mà, realtime cập nhật số lượng chỗ trống (slots). Chống quá tải bằng Redis Lock.
- **Tra cứu**: Xem Thời khóa biểu dạng lịch tuần (Weekly Calendar), tra cứu Bảng điểm (Transcript).

---

## 🏗️ Kiến Trúc Hệ Thống & Phân bổ Cổng (Ports)

Hệ thống sử dụng Turborepo để chạy song song nhiều dịch vụ. Dưới đây là kiến trúc và cấu hình cổng (Port) chính xác khi chạy ở môi trường Local:

| Tên Dịch Vụ | Vai trò | Cổng (Port) | Công nghệ |
|---|---|---|---|
| **API Gateway** | Điểm vào duy nhất (Entry point), điều hướng API | `:3000` | NestJS |
| **Auth Service** | Xác thực JWT, Quản lý phân quyền | `:3001` | NestJS |
| **Student Service** | Quản lý hồ sơ Sinh viên (CRUD) | `:3002` | NestJS |
| **Course Service** | Quản lý Đào tạo, Xếp lịch | `:3003` | NestJS |
| **Enrollment Svc** | Xử lý Đăng ký tín chỉ (Redis Lock) | `:3004` | NestJS |
| **Web Portal** | Cổng Frontend dành cho Sinh viên | `:4000` | Next.js 14 |
| **Web Admin** | Cổng Frontend dành cho Quản trị viên | `:4005` | Next.js 16 |

---

## ⚙️ Hướng Dẫn Cài Đặt Lên Môi Trường Local (Getting Started)

### 1. Yêu cầu hệ thống (Prerequisites)

- **Node.js**: Phiên bản `>= 18.x` (Khuyến nghị bản `20.x LTS`).
- **Docker & Docker Compose**: Dùng để chạy CSDL PostgreSQL và Redis.
- **Git**: Để clone mã nguồn.

### 2. Các bước cài đặt chi tiết

**Bước 1: Clone dự án và cài đặt thư viện**

```bash
git clone https://github.com/your-username/university-system.git
cd university-system

# Cài đặt toàn bộ dependencies cho tất cả các workspace trong Monorepo
npm install
```

**Bước 2: Cấu hình biến môi trường**

Copy file `.env.example` thành file `.env` tại thư mục gốc của dự án (Root directory).

Cấu hình các thông số cơ bản (Mặc định thường đã được set sẵn để chạy local):

```env
DATABASE_URL="sqlserver://localhost;database=student_db;integratedSecurity=true;trustServerCertificate=true;"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="super-secret-jwt-key-for-development"
```

**Bước 3: Khởi động Hạ tầng (Infrastructure)**

Khởi động CSDL PostgreSQL và Redis thông qua Docker:

```bash
docker-compose up -d
```

*(Kiểm tra lại trên Docker Desktop để chắc chắn 2 container `postgres` và `redis` đang ở trạng thái Running).*

**Bước 4: Khởi tạo Cơ sở dữ liệu (Database Setup)**

Đồng bộ Schema vào Database và khởi tạo dữ liệu mẫu (Seed):

```bash
# Push schema lên database
npx prisma db push

# (Tùy chọn) Chạy seed data nếu dự án có file seed.ts
npx prisma db seed
```

**Bước 5: Khởi chạy toàn bộ hệ thống**

Sử dụng sức mạnh của Turborepo để chạy tất cả Frontend và Backend cùng lúc:

```bash
npm run dev
```

---

## 🌐 Truy cập Hệ thống (Access URLs)

Sau khi chạy lệnh `npm run dev` thành công, hãy mở trình duyệt và truy cập các đường dẫn sau:

- 🎓 **Cổng Sinh viên (Student Portal)**: http://localhost:4000
- 🛡️ **Cổng Quản trị (Admin Dashboard)**: http://localhost:4005
- 🔌 **API Gateway (Nơi nhận mọi request)**: http://localhost:3000

**Test API cơ bản:**
- Test đăng nhập: `POST http://localhost:3000/api/auth/login`
- Test danh sách SV: `GET http://localhost:3000/api/students`

**Tài khoản mặc định (Default Credentials):**
- **Admin**: `admin@unisys.edu` / `123456`
- **Student**: `student@unisys.edu` / `123456`

---

## ☁️ Hướng Dẫn Triển Khai Thực Tế (Deployment Guide)

Để đưa hệ thống lên Internet, dự án được thiết kế để dễ dàng CI/CD trên các nền tảng Cloud hiện đại:

### 1. Triển khai Database & Redis (Miễn phí)

- **PostgreSQL**: Tạo database trên [Neon.tech](https://neon.tech/) hoặc [Supabase](https://supabase.com/). Lấy chuỗi `DATABASE_URL`.
- **Redis**: Tạo một instance trên [Upstash](https://upstash.com/). Lấy `REDIS_URL`.

### 2. Triển khai Backend (NestJS Microservices)

- Sử dụng [Render.com](https://render.com/) hoặc [Railway.app](https://railway.app/).
- Tạo các "Web Service" riêng biệt cho từng thư mục (VD: `apps/api-gateway`, `apps/auth-service`...).
- **Lưu ý quan trọng**: Cần thêm các biến môi trường (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`) vào phần cài đặt biến môi trường của nền tảng deploy.

### 3. Triển khai Frontend (Next.js)

- Đăng nhập vào [Vercel.com](https://vercel.com/), chọn **Import Project** từ GitHub.
- Chọn thư mục (Root directory) là `apps/web-portal` (cho Sinh viên) và `apps/web-admin` (cho Admin).
- Thêm biến môi trường `NEXT_PUBLIC_API_URL` trỏ về domain của API Gateway đã deploy ở bước 2 (Ví dụ: `https://my-api-gateway.onrender.com`).
- Bấm **Deploy** và đợi Vercel xử lý.

---

## 📝 Lưu Ý Dành Cho Developers

- Code dùng chung (DTOs, Prisma Client, Auth Guards) được đặt trong thư mục `packages/`.
- Bất cứ khi nào có sự thay đổi trong `schema.prisma`, phải chạy lệnh `npx prisma db push` và `npx prisma generate` để cập nhật lại Type cho toàn bộ hệ thống.
