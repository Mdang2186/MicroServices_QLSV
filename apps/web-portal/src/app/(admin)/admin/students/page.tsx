"use client";

import { useEffect, useState } from "react";
import { Plus, Search, MoreHorizontal, Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import api from "@/lib/api";

interface Student {
    id: string; // Internal ID
    code: string; // Student ID (visible)
    name: string;
    email: string;
    dob: string;
    status?: string;
    department?: string;
}

export default function StudentListPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInternalLoading, setIsInternalLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        email: "",
        dob: "",
    });

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/students");
            setStudents(res.data);
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const filteredStudents = students.filter((student) => {
        const term = searchTerm.toLowerCase();
        return (
            (student.name?.toLowerCase() || "").includes(term) ||
            (student.email?.toLowerCase() || "").includes(term) ||
            (student.code?.toLowerCase() || "").includes(term) ||
            (student.id?.toLowerCase() || "").includes(term)
        );
    });

    const handleOpenAdd = () => {
        setEditingStudent(null);
        setFormData({ code: "", name: "", email: "", dob: "" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            code: student.code,
            name: student.name,
            email: student.email,
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : "",
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInternalLoading(true);
        try {
            if (editingStudent) {
                await api.put(`/api/students/${editingStudent.id}`, formData);
            } else {
                await api.post("/api/students", formData);
            }
            setIsModalOpen(false);
            fetchStudents();
        } catch (err) {
            console.error("Operation failed", err);
            alert("Failed to save student");
        } finally {
            setIsInternalLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Students</h1>
                    <p className="text-muted-foreground">Manage student records and enrollments.</p>
                </div>
                {/* @ts-expect-error React 18/19 ReactNode type mismatch */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    {/* @ts-expect-error React 18/19 ReactNode type mismatch */}
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenAdd} className="bg-admin-primary text-white hover:bg-slate-800">
                            <Plus className="mr-2 h-4 w-4" /> Add Student
                        </Button>
                    </DialogTrigger>
                    {/* @ts-expect-error React 18/19 ReactNode type mismatch */}
                    <DialogContent>
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                {/* @ts-expect-error React 18/19 ReactNode type mismatch */}
                                <DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
                                {/* @ts-expect-error React 18/19 ReactNode type mismatch */}
                                <DialogDescription>
                                    Enter student details. Click save when you're done.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <label>Student Code</label>
                                    <Input
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="SV001"
                                        disabled={!!editingStudent}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label>Name</label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label>Email</label>
                                    <Input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label>Date of Birth</label>
                                    <Input
                                        type="date"
                                        required
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isInternalLoading}>
                                    {isInternalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search students..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>DoB</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                            </TableRow>
                        ) : filteredStudents.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell className="font-medium">{student.code}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(student)}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
