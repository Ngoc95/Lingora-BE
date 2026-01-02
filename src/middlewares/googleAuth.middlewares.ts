import { Request, Response, NextFunction } from 'express';
import { googleAuthService } from '~/services/googleAuth.service';
import { BadRequestError } from '~/core/error.response';
import { User } from '~/entities/user.entity';

/**
 * Middleware to validate Google ID token
 * Verifies the token and attaches Google profile to request
 */
export const googleAuthValidation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            throw new BadRequestError({ message: 'Google ID token is required' });
        }

        // Verify Google token and get user profile
        const googleProfile = await googleAuthService.verifyGoogleToken(idToken);

        // Attach Google profile to request for controller to use
        (req as any).googleProfile = googleProfile;

        // Try to find existing user by googleId or email (like login validation)
        const user = await User.findOne({
            where: [
                { googleId: googleProfile.id },
                { email: googleProfile.email }
            ],
            relations: ['roles']
        });

        // Attach user to request if found (controller can check if user exists)
        if (user) {
            (req as any).user = user;
        }

        next();
    } catch (error) {
        next(error);
    }
};
