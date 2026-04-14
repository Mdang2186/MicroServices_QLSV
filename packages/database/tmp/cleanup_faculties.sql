-- Merge redundant Faculty F01 into FAC_CNTT
UPDATE Major SET facultyId = 'FAC_CNTT' WHERE facultyId = 'F01';
DELETE FROM Faculty WHERE id = 'F01';
