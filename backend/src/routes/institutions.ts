import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { Institution } from '../models/Institution';

const router = Router();

// GET /institutions - all institutions
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const institutions = await Institution.find();
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching institutions' });
    }
});

// GET /institutions/:id - single institution
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const institution = await Institution.findById(req.params.id);
        if (!institution) {
            return res.status(404).json({ message: 'Institution not found' });
        }
        res.json(institution);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching institution' });
    }
});

export default router;