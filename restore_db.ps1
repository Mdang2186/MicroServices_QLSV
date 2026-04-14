
$ErrorActionPreference = "Stop"
Write-Host "Dropping and recreating student_db for a clean restore..."
Invoke-Sqlcmd -ServerInstance localhost -Username sa -Password Mdang2186 -Query "IF EXISTS (SELECT name FROM sys.databases WHERE name = 'student_db') BEGIN ALTER DATABASE student_db SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE student_db; END; CREATE DATABASE student_db;"
Write-Host "Importing new_schema_data7.sql (224MB). This may take a few minutes..."
Invoke-Sqlcmd -ServerInstance localhost -Username sa -Password Mdang2186 -InputFile "new_schema_data7.sql" -AbortOnError -ConnectionTimeout 600 -QueryTimeout 600
Write-Host "Import completed successfully."
