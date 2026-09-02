import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { MobilityApplication } from '../models/MobilityApplication';

const router = Router();

// POST /applications - studente crea una domanda
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    const { institutionId, lecturerId, academicYear, mobilityPeriod } = req.body;

    if (!institutionId || !lecturerId || !academicYear || !mobilityPeriod) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const application = new MobilityApplication({
            studentId: req.user!.id,    // viene dal token, non dal body
            institutionId,
            lecturerId,
            academicYear,
            mobilityPeriod,
            status: 'created'           // status iniziale
        });
        await application.save();
        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error creating application' });
    }
});

// GET /applications - lista filtrata per ruolo
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        let applications;
        const { role, id } = req.user!;

        if (role === 'student') {
            // studente vede solo le sue
            applications = await MobilityApplication.find({ studentId: id });
        } else if (role === 'lecturer') {
            // referente vede solo quelle in cui è assegnato
            applications = await MobilityApplication.find({ lecturerId: id });
        } else {
            // staff vede tutto
            applications = await MobilityApplication.find();
        }

        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

// GET /applications/:id - dettaglio singola domanda
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching application' });
    }
});

// POST /applications/:id/mappings  → aggiunge uno o più exam mapping alla domanda
router.post('/:id/mappings', authMiddleware, async (req: Request, res: Response) => {
    // solo gli studenti possono aggiungere mapping
    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can add mappings' });
    }

    const { mappings } = req.body;
    if (!Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({ message: 'Mappings must be a non-empty array' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // verifica che la domanda appartenga allo studente loggato
        if (application.studentId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        application.mappings.push(...mappings);
        await application.save();

        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error adding mappings' });
    }
});

export default router;