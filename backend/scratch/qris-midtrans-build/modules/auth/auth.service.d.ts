import { LoginInput } from './auth.schema';
export declare class AuthService {
    login(input: LoginInput): Promise<{
        token: string;
        refreshToken: string;
        user: {
            id: number;
            name: string;
            username: string;
            email: string | null;
            roleId: number;
            roleName: string;
            permissions: Record<string, string>;
            avatar: string | null;
        };
    }>;
    refreshToken(token: string): Promise<{
        token: string;
        refreshToken: string;
    }>;
    getProfile(userId: number): Promise<{
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        roleName: string;
        permissions: Record<string, string>;
        avatar: string | null;
        lastLogin: Date | null;
    }>;
    changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void>;
}
export declare const authService: AuthService;
