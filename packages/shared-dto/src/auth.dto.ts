import { Role } from './enums';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    username: string;
    email: string;
    password: string;
    role?: Role;
}

export interface UserResponse {
    id: string;
    username: string;
    email: string;
    role: string;
    accessToken?: string;
}
