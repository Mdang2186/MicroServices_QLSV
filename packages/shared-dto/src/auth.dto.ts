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
    profileId?: string;
    fullName?: string;
    degree?: string;
}

export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}

export interface ForgotPasswordDto {
    email: string;
    clientBaseUrl?: string;
}

export interface ResetPasswordDto {
    token?: string;
    sessionToken?: string;
    otp?: string;
    newPassword: string;
}
