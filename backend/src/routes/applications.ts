import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { MobilityApplication } from '../models/MobilityApplication';
import multer from 'multer';
import path from 'path';

const router = Router();

// POST /applications - student creates an application
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    const { institutionId, lecturerId, academicYear, mobilityPeriod } = req.body;

    if (!institutionId || !lecturerId || !academicYear || !mobilityPeriod) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const application = new MobilityApplication({
            studentId: req.user!.id,    
            institutionId,
            lecturerId,
            academicYear,
            mobilityPeriod,
            status: 'created'           // initial status
        });
        await application.save();
        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error creating application' });
    }
});

// GET /applications - filtered list of applications based on user role
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        let applications;
        const { role, id } = req.user!;

        if (role === 'student') {
            // student see only their applications
            applications = await MobilityApplication.find({ studentId: id });
        } else if (role === 'lecturer') {
            // lecturer see only applications they are assigned to
            applications = await MobilityApplication.find({ lecturerId: id });
        } else {
            // staff see all applications
            applications = await MobilityApplication.find();
        }

        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

// GET /applications/:id - single application detail
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

// POST /applications/:id/mappings  → add mappings to an application (only for students)
router.post('/:id/mappings', authMiddleware, async (req: Request, res: Response) => {
    // only students can add mappings
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

        // check if the student owns this application
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

// POST /applications/:id/learning-agreement
const storage = multer.diskStorage({
    destination: 'uploads/',       // dove salva i file
    filename: (req, file, cb) => {
        // nome univoco: timestamp + nome originale
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

router.post('/:id/learning-agreement', 
    authMiddleware, 
    upload.single('file'),         
    async (req: Request, res: Response) => {

    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can upload learning agreements' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.studentId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        application.learningAgreements.push({
            filePath: req.file.path,
            uploadedAt: new Date(),
            status: 'pending'           // ← mancava
        });

        application.status = 'awaiting_la_approval';  // ← mancava

        await application.save();
        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading learning agreement' });
    }
});

//PATCH /applications/:id/learning-agreement/:agreementId/evaluate
router.patch('/:id/learning-agreement/:agreementId/evaluate', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'lecturer') {
        return res.status(403).json({ message: 'Only lecturers can evaluate learning agreements' });
    }
    
    const { decision, reason } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: 'Decision must be either "approved" or "rejected"' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.lecturerId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const learningAgreement = application.learningAgreements.find(
            (la) => String(la._id) === req.params.agreementId
        );
        if (!learningAgreement) {
            return res.status(404).json({ message: 'Learning agreement not found' });
        }

        learningAgreement.status = decision;
        learningAgreement.decisionDate = new Date();  
        if (reason) {
            learningAgreement.reason = reason;
        }

        await application.save();
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error evaluating learning agreement' });
    }
});

export default router;