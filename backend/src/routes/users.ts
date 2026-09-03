import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

// GET /users/lecturers - lista dei docenti referenti
router.get('/lecturers', authMiddleware, async (req: Request, res: Response) => {
    try {
        const lecturers = await User.find({ role: 'lecturer' })
            .select('firstName lastName email');   // niente passwordHash
        res.json(lecturers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lecturers' });
    }
});

export default router;