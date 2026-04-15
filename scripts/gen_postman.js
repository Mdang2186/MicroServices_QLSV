const fs = require('fs');
const path = require('path');

const collection = {
    "info": {
        "name": "UNETI - Toàn Tập API Microservices (Auto Test)",
        "description": "Bộ Test tự động toàn diện kiểm tra tất cả các Microservices trong dự án Quản lý sinh viên (QLSV). Bao gồm Auth, Course, Student, Enrollment, và Grade Services.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        { "key": "base_url", "value": "http://localhost:3000", "type": "string" },
        { "key": "access_token", "value": "", "type": "string" },
        { "key": "student_id", "value": "", "type": "string" },
        { "key": "course_class_id", "value": "", "type": "string" },
        { "key": "session_id", "value": "", "type": "string" },
        { "key": "semester_id", "value": "", "type": "string" },
        { "key": "admin_class_id", "value": "", "type": "string" }
    ],
    "auth": {
        "type": "bearer",
        "bearer": [
            { "key": "token", "value": "{{access_token}}", "type": "string" }
        ]
    },
    "item": [
        {
            "name": "1. Authentication Service",
            "item": [
                {
                    "name": "Login to get Token",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Bắt buộc phản hồi 200/201 (Login thành công)\", function () {",
                                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                                    "});",
                                    "if (pm.response.code === 201 || pm.response.code === 200) {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.test(\"Bắt buộc chứa accessToken\", function () {",
                                    "        pm.expect(jsonData.accessToken).to.exist;",
                                    "    });",
                                    "    pm.collectionVariables.set(\"access_token\", jsonData.accessToken);",
                                    "    console.log(\"Saved login Token!\");",
                                    "}"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "auth": { "type": "noauth" },
                        "method": "POST",
                        "header": [{ "key": "Content-Type", "value": "application/json" }],
                        "body": {
                            "mode": "raw",
                            "raw": JSON.stringify({ "username": "admin", "password": "password" }, null, 4)
                        },
                        "url": { "raw": "{{base_url}}/api/auth/login", "host": ["{{base_url}}"], "path": ["api", "auth", "login"] }
                    }
                }
            ]
        },
        {
            "name": "2. Dữ liệu Hệ thống (Danh mục)",
            "item": [
                {
                    "name": "Get Tất cả Học Kỳ (Semesters)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                                    "var jsonData = pm.response.json();",
                                    "pm.test(\"Data is array (trực tiếp hoặc qua wrapper data)\", () => {",
                                    "    var arr = Array.isArray(jsonData) ? jsonData : jsonData.data;",
                                    "    pm.expect(arr).to.be.an('array');",
                                    "    if(arr && arr.length > 0) pm.collectionVariables.set('semester_id', arr[0].id);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/semesters", "host": ["{{base_url}}"], "path": ["api", "semesters"] } }
                },
                {
                    "name": "Get Khoa (Faculties)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Status is 200\", () => { pm.response.to.have.status(200); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/faculties", "host": ["{{base_url}}"], "path": ["api", "faculties"] } }
                },
                {
                    "name": "Get Môn Học (Subjects)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Status is 200\", () => { pm.response.to.have.status(200); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/subjects/by-faculty", "host": ["{{base_url}}"], "path": ["api", "subjects", "by-faculty"] } }
                },
                {
                    "name": "Get Phòng Học (Rooms)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Status is 200\", () => { pm.response.to.have.status(200); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/rooms", "host": ["{{base_url}}"], "path": ["api", "rooms"] } }
                }
            ]
        },
        {
            "name": "3. Student Service (Sinh viên & Lớp Hành Chính)",
            "item": [
                {
                    "name": "Get Lớp Hành Chính (Admin Classes)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                                    "var data = pm.response.json().data || pm.response.json();",
                                    "if(Array.isArray(data) && data.length > 0) {",
                                    "    pm.collectionVariables.set('admin_class_id', data[0].id);",
                                    "}"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/admin-classes", "host": ["{{base_url}}"], "path": ["api", "admin-classes"] } }
                },
                {
                    "name": "Get Danh sách Sinh Viên",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                                    "var jsonData = pm.response.json();",
                                    "if (jsonData.data && jsonData.data.length > 0) {",
                                    "    pm.collectionVariables.set('student_id', jsonData.data[0].id);",
                                    "}"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/students?page=1&limit=20", "host": ["{{base_url}}"], "path": ["api", "students"], "query": [ { "key": "page", "value": "1" }, { "key": "limit", "value": "20" } ] } }
                },
                {
                    "name": "Get Hồ sơ Sinh viên (Chi tiết)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                        "pm.test(\"Phải là Object hồ sơ\", () => { pm.expect(pm.response.json()).to.be.an('object'); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/students/{{student_id}}", "host": ["{{base_url}}"], "path": ["api", "students", "{{student_id}}"] } }
                }
            ]
        },
        {
            "name": "4. Course Service (Quản lý Học Phần)",
            "item": [
                {
                    "name": "Get Danh sách Lớp Học Phần",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                                    "var jsonData = pm.response.json();",
                                    "if (jsonData.data && jsonData.data.length > 0) {",
                                    "    pm.collectionVariables.set('course_class_id', jsonData.data[0].id);",
                                    "}"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/courses?page=1&limit=10", "host": ["{{base_url}}"], "path": ["api", "courses"], "query": [ { "key": "page", "value": "1" }, { "key": "limit", "value": "10" } ] } }
                },
                {
                    "name": "Get Chi tiết Lớp Học Phần & Thời khóa biểu",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                                    "var jsonData = pm.response.json();",
                                    "if(jsonData && jsonData.sessions) {",
                                    "     pm.test('Kiểm tra mảng Sessions/Schedules sinh ra', () => { pm.expect(jsonData.sessions).to.be.an('array'); });",
                                    "     if(jsonData.sessions.length > 0) pm.collectionVariables.set('session_id', jsonData.sessions[0].id);",
                                    "}"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/courses/classes/{{course_class_id}}", "host": ["{{base_url}}"], "path": ["api", "courses", "classes", "{{course_class_id}}"] } }
                },
                {
                    "name": "Mô phỏng Đổi Lịch (Xét trùng phòng / ca)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Đổi lịch có thể OK (200) hoặc Reject do trùng lịch (400)\", () => { pm.expect(pm.response.code).to.be.oneOf([200, 400]); });"
                    ], "type": "text/javascript" } }],
                    "request": {
                        "method": "PATCH",
                        "header": [{ "key": "Content-Type", "value": "application/json" }],
                        "body": {
                            "mode": "raw",
                            "raw": JSON.stringify({ "date": "2026-05-15T00:00:00.000Z", "roomId": "some-valid-room-id", "startShift": 1, "endShift": 3, "note": "Auto Test Reschedule" }, null, 4)
                        },
                        "url": { "raw": "{{base_url}}/api/courses/sessions/{{session_id}}/reschedule", "host": ["{{base_url}}"], "path": ["api", "courses", "sessions", "{{session_id}}", "reschedule"] }
                    }
                }
            ]
        },
        {
            "name": "5. Enrollment & Grade Services",
            "item": [
                {
                    "name": "Get Tất Cả Bản Lưu Ghi Danh (Enrollments)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Status code is 200\", () => { pm.response.to.have.status(200); });",
                        "pm.test(\"Khung dữ liệu hợp lệ\", () => { pm.expect(pm.response.json().data).to.be.an('array'); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/enrollments?page=1&limit=10", "host": ["{{base_url}}"], "path": ["api", "enrollments"], "query": [ { "key": "page", "value": "1" }, { "key": "limit", "value": "10" } ] } }
                },
                {
                    "name": "Get Bảng Điểm Tổng Của Lớp Hành Chính (Admin Grades)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Có thể lấy được hoặc lỗi do thiếu ID chuẩn, expect 200|400\", () => { pm.expect(pm.response.code).to.be.oneOf([200, 400]); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/grades/admin-classes/{{admin_class_id}}/summary", "host": ["{{base_url}}"], "path": ["api", "grades", "admin-classes", "{{admin_class_id}}", "summary"] } }
                },
                {
                    "name": "Get Bảng Điểm Học Phần (Course Grades)",
                    "event": [{ "listen": "test", "script": { "exec": [
                        "pm.test(\"Trúng endpoint lấy điểm lớp học phần, expect 200/400\", () => { pm.expect(pm.response.code).to.be.oneOf([200, 400]); });"
                    ], "type": "text/javascript" } }],
                    "request": { "method": "GET", "url": { "raw": "{{base_url}}/api/grades/course-classes/{{course_class_id}}", "host": ["{{base_url}}"], "path": ["api", "grades", "course-classes", "{{course_class_id}}"] } }
                }
            ]
        }
    ]
};

const filePath = path.join(__dirname, '..', 'UNETI_Auto_Test.postman_collection.json');
fs.writeFileSync(filePath, JSON.stringify(collection, null, 2), 'utf-8');
console.log('Đã xuất thành công bộ Postman Toàn Diện ra: ' + filePath);
