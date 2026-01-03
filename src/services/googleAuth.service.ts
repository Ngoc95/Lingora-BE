import { OAuth2Client } from 'google-auth-library';
import { BadRequestError } from '~/core/error.response';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleUserProfile {
    id: string;
    email: string;
    name: string;
    picture?: string;
    email_verified: boolean;
}

export class GoogleAuthService {
    /**
     * Verify Google ID token and extract user profile
     * @param idToken - Google ID token from client
     * @returns Google user profile
     */
    async verifyGoogleToken(idToken: string): Promise<GoogleUserProfile> {
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();

            if (!payload) {
                throw new BadRequestError({ message: 'Invalid Google token payload' });
            }

            if (!payload.email_verified) {
                throw new BadRequestError({ message: 'Google email not verified' });
            }

            return {
                id: payload.sub,
                email: payload.email!,
                name: payload.name || payload.email!.split('@')[0],
                picture: payload.picture,
                email_verified: payload.email_verified,
            };
        } catch (error: any) {
            console.error('Google token verification error:', error);
            throw new BadRequestError({
                message: `Invalid Google token: ${error.message}`
            });
        }
    }
}

export const googleAuthService = new GoogleAuthService();
