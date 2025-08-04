import { createContext } from 'react';

export interface AuthCtx {
    isAuth:   boolean;
    login:    (u: string, p: string) => Promise<void>;
    register: (u: string, p: string) => Promise<void>;
    logout:   () => void;
}

export const AuthContext = createContext<AuthCtx | null>(null);
