import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '~/config/env';
import { TokenType } from '~/enums/tokenType.enum';

export const hashData = (data: string) => {
    return bcrypt.hashSync(data, 10)
}

export const signToken = (payload: object, secretKey: string, options?: SignOptions) => {
    return new Promise<string>((resolve, reject) => {
        jwt.sign(payload, secretKey, { ...options, jwtid: uuidv4(), algorithm: 'HS256' }, (err, token) => {
            if (err) reject(err);
            resolve(token as string);
        });
    });
};

export const signAccessToken = async (userId: number, expiresIn?: string) => {
    return await signToken(
        { userId, tokenType: TokenType.accessToken },
        env.JWT_ACCESS_SECRET,
        { expiresIn: expiresIn || env.JWT_ACCESS_EXPIRE_TIME as any }
    );
};

export const signRefreshToken = async (userId: number) => {
    return await signToken(
        { userId, tokenType: TokenType.refreshToken },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRE_TIME as any }
    );
};

export const signResetPasswordToken = async (userId: number) => {
    return await signToken(
        { userId, tokenType: TokenType.resetPasswordToken },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '10m' }
    );
};

export const verifyToken = (token: string, secretKey: string) => {
    return jwt.verify(token, secretKey);
};
