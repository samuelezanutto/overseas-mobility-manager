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

//PATCH /applications/:id/pre-departure
router.patch('/:id/pre-departure', authMiddleware, async (req: Request, res: Response) => {
    //verify that the user is a staff member
    if (req.user!.role !== 'staff') {
        return res.status(403).json({ message: 'Only staff can update pre-departure status' });
    }

    //find the application
    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        //verify at least one learning agreement is approved
        const approvedLA = application.learningAgreements.some(la => la.status === 'approved');
        if (!approvedLA) {
            return res.status(400).json({ message: 'At least one learning agreement must be approved before updating pre-departure status' });
        }

        //update status = 'pre_departure_completed'
        application.status = 'pre_departure_completed';
        await application.save();
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error updating pre-departure status' });
    }
});

//PATCH /applications/:id/dates
router.patch('/:id/dates', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can update dates' });
    }

    const { arrivalDate, departureDate } = req.body;
    if (!arrivalDate || !departureDate) {
        return res.status(400).json({ message: 'Both arrivalDate and departureDate are required' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.studentId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        application.arrivalDate = new Date(arrivalDate);
        application.departureDate = new Date(departureDate);
        application.status = 'mobility_in_progress';  // ← prima del save

        await application.save();
        res.json(application);                         // ← ultima cosa
    } catch (error) {
        res.status(500).json({ message: 'Error updating dates' });
    }
});

//POST /applications/:id/modifications
router.post('/:id/modifications',
    authMiddleware,
    upload.single('file'),         
    async (req: Request, res: Response) => {

    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can request modifications' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'A new learning agreement file is required' });
    }

    const { description, proposedMappings } = req.body;
    if (!description) {
        return res.status(400).json({ message: 'Description is required' });
    }

    let parsedMappings;
    try {
        parsedMappings = typeof proposedMappings === 'string' 
            ? JSON.parse(proposedMappings) 
            : proposedMappings;
    } catch {
        return res.status(400).json({ message: 'Invalid proposedMappings format' });
    }

    if (!Array.isArray(parsedMappings) || parsedMappings.length === 0) {
        return res.status(400).json({ message: 'proposedMappings must be a non-empty array' });
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
            status: 'pending'
        });

        application.modifications.push({
            description,
            proposedMappings: parsedMappings,
            status: 'pending'
        });

        await application.save();
        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error requesting modification' });
    }
});

//PATCH /applications/:id/modifications/:modificationId/evaluate
router.patch('/:id/modifications/:modificationId/evaluate', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'lecturer') {
        return res.status(403).json({ message: 'Only lecturers can evaluate modifications' });
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

        const modification = application.modifications.find(
            mod => String(mod._id) === req.params.modificationId
        );
        if (!modification) {
            return res.status(404).json({ message: 'Modification not found' });
        }

        modification.status = decision;
        modification.decisionDate = new Date();
        if (reason) {
            modification.reason = reason;
        }

        if (decision === 'approved') {
            application.mappings.forEach(m => { m.isActive = false; });
            
            modification.proposedMappings.forEach(pm => {
                application.mappings.push({
                    foreignCode: pm.foreignCode,
                    foreignName: pm.foreignName,
                    foreignCredits: pm.foreignCredits,
                    cfCode: pm.cfCode,
                    cfName: pm.cfName,
                    cfCredits: pm.cfCredits,
                    isActive: true
                });
            });
        }

        await application.save();
        res.json(application);
    } catch (error) {
        console.error('Error evaluating modification:', error);
        res.status(500).json({ message: 'Error evaluating modification' });
    }
});

export default router;