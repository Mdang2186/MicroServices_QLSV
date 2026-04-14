SELECT d.id, d.name, d.code, (SELECT COUNT(*) FROM Major m WHERE m.facultyId = d.id) AS major_count
FROM Faculty d
WHERE d.name LIKE N'%Công nghệ thông tin%';
