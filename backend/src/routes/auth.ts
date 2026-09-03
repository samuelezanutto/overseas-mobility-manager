import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';

const router = Router();

// POST /auth/register
// Public self-registration is restricted to students: lecturer/staff accounts
// are provisioned separately (see seed.ts) so this endpoint never trusts a
// client-supplied role.
router.post('/register', async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, matriculationNumber } = req.body;

    if (!email || !password || !firstName || !lastName || !matriculationNumber) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            passwordHash,
            firstName,
            lastName,
            role: 'student',
            matriculationNumber
        });
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                matriculationNumber: user.matriculationNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                matriculationNumber: user.matriculationNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

export default router;