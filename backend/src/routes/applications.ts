import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { MobilityApplication } from '../models/MobilityApplication';
import { Institution } from '../models/Institution';
import { User } from '../models/User';
import multer from 'multer';
import path from 'path';

const router = Router();

// a Mongoose ValidationError (bad enum value, missing required subdocument
// field, etc.) or CastError (malformed ObjectId) means the request was
// malformed, not a server failure
function handleError(res: Response, error: unknown, fallbackMessage: string) {
    if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid id format' });
    }
    console.error(fallbackMessage, error);
    return res.status(500).json({ message: fallbackMessage });
}

// POST /applications - student creates an application
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can create applications' });
    }

    const { institutionId, lecturerId, academicYear, mobilityPeriod } = req.body;

    if (!institutionId || !lecturerId || !academicYear || !mobilityPeriod) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const institution = await Institution.findById(institutionId);
        if (!institution) {
            return res.status(400).json({ message: 'Institution not found' });
        }

        const lecturer = await User.findOne({ _id: lecturerId, role: 'lecturer' });
        if (!lecturer) {
            return res.status(400).json({ message: 'Lecturer not found' });
        }

        const application = new MobilityApplication({
            studentId: req.user!.id,
            institutionId,
            lecturerId,
            academicYear,
            mobilityPeriod,
            status: 'created'
        });
        await application.save();
        res.status(201).json(application);
    } catch (error) {
        handleError(res, error, 'Error creating application');
    }
});

// GET /applications - filtered list of applications based on user role
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        let applications;
        const { role, id } = req.user!;

        if (role === 'student') {
            // students see only their own applications
            applications = await MobilityApplication.find({ studentId: id });
        } else if (role === 'lecturer') {
            // lecturers see only applications they are assigned to
            applications = await MobilityApplication.find({ lecturerId: id });
        } else {
            // staff see all applications, with the host institution populated
            // so the dashboard can break them down by country/institution
            applications = await MobilityApplication.find().populate('institutionId', 'name country city');
        }

        res.json(applications);
    } catch (error) {
        handleError(res, error, 'Error fetching applications');
    }
});

// GET /applications/:id - single application detail
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const { role, id } = req.user!;
        const isOwner = application.studentId.toString() === id;
        const isReferent = application.lecturerId.toString() === id;

        if (role !== 'staff' && !isOwner && !isReferent) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error fetching application');
    }
});

// POST /applications/:id/mappings - add mappings to an application (only for students)
router.post('/:id/mappings', authMiddleware, async (req: Request, res: Response) => {
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

        if (application.studentId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (application.status !== 'created') {
            return res.status(400).json({
                message: 'Exams can only be added before the Learning Agreement is submitted; use a modification request afterwards'
            });
        }

        application.mappings.push(...mappings);
        await application.save();

        res.status(201).json(application);
    } catch (error) {
        handleError(res, error, 'Error adding mappings');
    }
});

// POST /applications/:id/learning-agreement
const storage = multer.diskStorage({
    destination: 'uploads/',       // where files are saved
    filename: (req, file, cb) => {
        // unique name: timestamp + original name
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        // reject silently: req.file stays undefined and the route's own
        // "No file uploaded" check reports it as a normal 400
        cb(null, ALLOWED_DOCUMENT_TYPES.includes(file.mimetype));
    }
});

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

            if (!['created', 'awaiting_la_approval'].includes(application.status)) {
                return res.status(400).json({
                    message: 'A Learning Agreement cannot be uploaded in the current application status'
                });
            }

            const lastLA = application.learningAgreements[application.learningAgreements.length - 1];
            if (lastLA && lastLA.status !== 'rejected') {
                return res.status(400).json({
                    message: 'A Learning Agreement has already been submitted; use a modification request to change it'
                });
            }

            application.learningAgreements.push({
                filePath: req.file.path,
                uploadedAt: new Date(),
                status: 'pending'
            });

            application.status = 'awaiting_la_approval';

            await application.save();
            res.status(201).json(application);
        } catch (error) {
            handleError(res, error, 'Error uploading learning agreement');
        }
    });

// PATCH /applications/:id/learning-agreement/:agreementId/evaluate
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

        if (['closed', 'canceled'].includes(application.status)) {
            return res.status(400).json({ message: 'Cannot evaluate anything on a closed or canceled application' });
        }

        const learningAgreement = application.learningAgreements.find(
            (la) => String(la._id) === req.params.agreementId
        );
        if (!learningAgreement) {
            return res.status(404).json({ message: 'Learning agreement not found' });
        }

        if (learningAgreement.status !== 'pending') {
            return res.status(400).json({ message: 'This learning agreement has already been evaluated' });
        }

        learningAgreement.status = decision;
        learningAgreement.decisionDate = new Date();
        if (reason) {
            learningAgreement.reason = reason;
        }

        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error evaluating learning agreement');
    }
});

// PATCH /applications/:id/pre-departure
router.patch('/:id/pre-departure', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'staff') {
        return res.status(403).json({ message: 'Only staff can update pre-departure status' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status !== 'awaiting_la_approval') {
            return res.status(400).json({
                message: 'Pre-departure status can only be set while awaiting Learning Agreement approval'
            });
        }

        const approvedLA = application.learningAgreements.some(la => la.status === 'approved');
        if (!approvedLA) {
            return res.status(400).json({ message: 'At least one learning agreement must be approved before updating pre-departure status' });
        }

        application.status = 'pre_departure_completed';
        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error updating pre-departure status');
    }
});

// PATCH /applications/:id/dates
router.patch('/:id/dates', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can update dates' });
    }

    const { arrivalDate, departureDate } = req.body;
    if (!arrivalDate || !departureDate) {
        return res.status(400).json({ message: 'Both arrivalDate and departureDate are required' });
    }

    const parsedArrival = new Date(arrivalDate);
    const parsedDeparture = new Date(departureDate);
    if (isNaN(parsedArrival.getTime()) || isNaN(parsedDeparture.getTime())) {
        return res.status(400).json({ message: 'arrivalDate and departureDate must be valid dates' });
    }
    if (parsedDeparture <= parsedArrival) {
        return res.status(400).json({ message: 'departureDate must be after arrivalDate' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.studentId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (application.status !== 'pre_departure_completed') {
            return res.status(400).json({
                message: 'Pre-departure phase must be completed before setting mobility dates'
            });
        }

        application.arrivalDate = parsedArrival;
        application.departureDate = parsedDeparture;
        application.status = 'mobility_in_progress';

        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error updating dates');
    }
});

// POST /applications/:id/modifications
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

        const { description, proposedMappings, replacesMappingId } = req.body;
        if (!description) {
            return res.status(400).json({ message: 'Description is required' });
        }

        let parsedMappings;
        try {
            parsedMappings = proposedMappings === undefined
                ? []
                : typeof proposedMappings === 'string'
                    ? JSON.parse(proposedMappings)
                    : proposedMappings;
        } catch {
            return res.status(400).json({ message: 'Invalid proposedMappings format' });
        }

        if (!Array.isArray(parsedMappings)) {
            return res.status(400).json({ message: 'Invalid proposedMappings format' });
        }

        // a modification either proposes a new/replacement exam, removes an existing
        // one (replacesMappingId with no proposed mappings), or both
        if (parsedMappings.length === 0 && !replacesMappingId) {
            return res.status(400).json({ message: 'Propose a new exam, or select an exam to remove' });
        }

        try {
            const application = await MobilityApplication.findById(req.params.id);
            if (!application) {
                return res.status(404).json({ message: 'Application not found' });
            }

            if (application.studentId.toString() !== req.user!.id) {
                return res.status(403).json({ message: 'Access denied' });
            }

            if (application.status !== 'mobility_in_progress') {
                return res.status(400).json({
                    message: 'Modifications can only be requested while the mobility is in progress'
                });
            }

            // replacesMappingId is optional: set it to replace or remove an existing
            // active exam, leave it unset when it's a brand new exam
            if (replacesMappingId) {
                const target = application.mappings.find(
                    m => String(m._id) === replacesMappingId && m.isActive
                );
                if (!target) {
                    return res.status(400).json({ message: 'The exam to replace was not found among the active mappings' });
                }
            }

            application.learningAgreements.push({
                filePath: req.file.path,
                uploadedAt: new Date(),
                status: 'pending'
            });

            application.modifications.push({
                description,
                proposedMappings: parsedMappings,
                replacesMappingId: replacesMappingId || undefined,
                status: 'pending'
            });

            await application.save();
            res.status(201).json(application);
        } catch (error) {
            handleError(res, error, 'Error requesting modification');
        }
    });

// PATCH /applications/:id/modifications/:modificationId/evaluate
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

        if (['closed', 'canceled'].includes(application.status)) {
            return res.status(400).json({ message: 'Cannot evaluate anything on a closed or canceled application' });
        }

        const modification = application.modifications.find(
            mod => String(mod._id) === req.params.modificationId
        );
        if (!modification) {
            return res.status(404).json({ message: 'Modification not found' });
        }

        if (modification.status !== 'pending') {
            return res.status(400).json({ message: 'This modification has already been evaluated' });
        }

        modification.status = decision;
        modification.decisionDate = new Date();
        if (reason) {
            modification.reason = reason;
        }

        if (decision === 'approved') {
            if (modification.replacesMappingId) {
                const replaced = application.mappings.find(
                    m => String(m._id) === String(modification.replacesMappingId)
                );
                if (replaced) {
                    replaced.isActive = false;
                }
            }

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
        handleError(res, error, 'Error evaluating modification');
    }
});

// POST /applications/:id/transcript
router.post('/:id/transcript',
    authMiddleware,
    upload.single('file'),
    async (req: Request, res: Response) => {
        if (req.user!.role !== 'student') {
            return res.status(403).json({ message: 'Only students can upload transcripts' });
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

            if (application.status !== 'mobility_in_progress') {
                return res.status(400).json({
                    message: 'A transcript can only be uploaded while the mobility is in progress'
                });
            }

            application.transcripts.push({
                filePath: req.file.path,
                uploadedAt: new Date()
            });

            application.status = 'waiting_score_approval';

            await application.save();
            res.status(201).json(application);
        } catch (error) {
            handleError(res, error, 'Error uploading transcript');
        }
    });

// PATCH /applications/:id/mappings/:mappingId/result
router.patch('/:id/mappings/:mappingId/result', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'lecturer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { score, examDate } = req.body;
    if (!score || !examDate) {
        return res.status(400).json({ message: 'score and examDate are required' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.lecturerId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (application.status !== 'waiting_score_approval') {
            return res.status(400).json({
                message: 'Exam results can only be recorded while waiting for score approval'
            });
        }

        const mapping = application.mappings.find(m => String(m._id) === req.params.mappingId);
        if (!mapping) {
            return res.status(404).json({ message: 'Mapping not found' });
        }

        if (!mapping.isActive) {
            return res.status(400).json({ message: 'Cannot record a result for an inactive (superseded) mapping' });
        }

        // result is an IExamResult object, not a string
        mapping.result = {
            score,
            examDate: new Date(examDate),
            approvalStatus: 'approved'
        };

        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error updating mapping result');
    }
});

// PATCH /applications/:id/close
router.patch('/:id/close', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'staff') {
        return res.status(403).json({ message: 'Only staff can close applications' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status !== 'waiting_score_approval') {
            return res.status(400).json({
                message: 'Only an application waiting for score approval can be closed'
            });
        }

        const activeMappings = application.mappings.filter(m => m.isActive);
        const allActiveMappingsApproved = activeMappings.length > 0 &&
            activeMappings.every(m => m.result?.approvalStatus === 'approved');

        if (application.transcripts.length === 0 || !allActiveMappingsApproved) {
            return res.status(400).json({ message: 'Cannot close: missing transcript or not all active mappings are approved' });
        }

        application.status = 'closed';
        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error closing application');
    }
});

const TERMINAL_STATUSES = ['closed', 'canceled'];

// POST /applications/:id/cancellation-requests - student asks to cancel
router.post('/:id/cancellation-requests', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'student') {
        return res.status(403).json({ message: 'Only students can request a cancellation' });
    }

    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ message: 'A reason is required' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.studentId.toString() !== req.user!.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (TERMINAL_STATUSES.includes(application.status)) {
            return res.status(400).json({ message: 'This application is already closed or canceled' });
        }

        const alreadyPending = application.cancellationRequests.some(r => r.status === 'pending');
        if (alreadyPending) {
            return res.status(400).json({ message: 'A cancellation request is already pending' });
        }

        application.cancellationRequests.push({
            reason,
            status: 'pending',
            requestedAt: new Date()
        });

        await application.save();
        res.status(201).json(application);
    } catch (error) {
        handleError(res, error, 'Error requesting cancellation');
    }
});

// PATCH /applications/:id/cancellation-requests/:requestId/evaluate - staff decides
router.patch('/:id/cancellation-requests/:requestId/evaluate', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'staff') {
        return res.status(403).json({ message: 'Only staff can evaluate a cancellation request' });
    }

    const { decision, decisionReason } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: 'Decision must be either "approved" or "rejected"' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (TERMINAL_STATUSES.includes(application.status)) {
            return res.status(400).json({ message: 'This application is already closed or canceled' });
        }

        const request = application.cancellationRequests.find(
            r => String(r._id) === req.params.requestId
        );
        if (!request) {
            return res.status(404).json({ message: 'Cancellation request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'This cancellation request has already been evaluated' });
        }

        request.status = decision;
        request.decisionDate = new Date();
        if (decisionReason) {
            request.decisionReason = decisionReason;
        }

        if (decision === 'approved') {
            application.status = 'canceled';
        }

        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error evaluating cancellation request');
    }
});

// PATCH /applications/:id/cancel - staff cancels directly, at any time, with a reason
router.patch('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== 'staff') {
        return res.status(403).json({ message: 'Only staff can cancel an application directly' });
    }

    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ message: 'A reason is required' });
    }

    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (TERMINAL_STATUSES.includes(application.status)) {
            return res.status(400).json({ message: 'This application is already closed or canceled' });
        }

        application.cancellationRequests.push({
            reason,
            status: 'approved',
            requestedAt: new Date(),
            decisionDate: new Date()
        });

        application.status = 'canceled';
        await application.save();
        res.json(application);
    } catch (error) {
        handleError(res, error, 'Error canceling application');
    }
});

// GET /applications/:id/files/:filename - download a file
router.get('/:id/files/:filename', authMiddleware, async (req: Request, res: Response) => {
    try {
        const application = await MobilityApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const { role, id } = req.user!;
        const isOwner = application.studentId.toString() === id;
        const isReferent = application.lecturerId.toString() === id;

        if (role !== 'staff' && !isOwner && !isReferent) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const filename = req.params.filename;
        if (typeof filename !== 'string') {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const filePath = path.resolve('uploads', filename);
        res.sendFile(filePath);
    } catch (error) {
        handleError(res, error, 'Error downloading file');
    }
});

export default router;