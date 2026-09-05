import { Schema, model, Types } from 'mongoose';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MobilityPeriod = 'first_semester' | 'second_semester' | 'full_year';

export type MobilityStatus =
    'created' |
    'awaiting_la_approval' |
    'pre_departure_completed' |
    'mobility_in_progress' |
    'waiting_score_approval' |
    'closed' |
    'canceled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ─── Subdocument interfaces ───────────────────────────────────────────────────

export interface IExamResult {
    score: string;
    examDate: Date;
    approvalStatus: ApprovalStatus;
}

export interface IExamMapping {
    _id?: Types.ObjectId;
    foreignCode: string;
    foreignName: string;
    foreignCredits: number;
    cfCode: string;
    cfName: string;
    cfCredits: number;
    isActive: boolean;
    result?: IExamResult;
}

export interface ILearningAgreement {
    _id?: Types.ObjectId;
    filePath: string;
    uploadedAt: Date;
    status: ApprovalStatus;
    decisionDate?: Date;
    reason?: string;
}

export interface ITranscript {
    filePath: string;
    uploadedAt: Date;
}

export interface IModification {
    _id?: Types.ObjectId;
    description: string;
    status: ApprovalStatus;
    decisionDate?: Date;
    reason?: string;
    proposedMappings: IExamMapping[];
    // active mapping this modification replaces once approved; unset means the
    // proposed mappings are added on top of the existing ones
    replacesMappingId?: Types.ObjectId;
    // the Learning Agreement uploaded together with this modification; its
    // fate is tied to the modification's own evaluation (see the evaluate
    // route) so a rejection restores the previous Learning Agreement instead
    // of leaving this one pending forever
    learningAgreementId?: Types.ObjectId;
}

export interface ICancellationRequest {
    _id?: Types.ObjectId;
    // why the cancellation is wanted; set by the student when requesting one,
    // or by staff when force-cancelling directly
    reason: string;
    status: ApprovalStatus;
    requestedAt: Date;
    decisionDate?: Date;
    decisionReason?: string;
}

export interface IMobilityApplication {
    studentId: Types.ObjectId;
    lecturerId: Types.ObjectId;
    institutionId: Types.ObjectId;
    academicYear: string;
    mobilityPeriod: MobilityPeriod;
    status: MobilityStatus;
    arrivalDate?: Date;
    departureDate?: Date;
    mappings: IExamMapping[];
    learningAgreements: ILearningAgreement[];
    transcripts: ITranscript[];
    modifications: IModification[];
    cancellationRequests: ICancellationRequest[];
}

// ─── Subdocument schemas ──────────────────────────────────────────────────────

const examResultSchema = new Schema<IExamResult>({
    score: { type: String, required: true },
    examDate: { type: Date, required: true },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
});

const examMappingSchema = new Schema<IExamMapping>({
    foreignCode: { type: String, required: true },
    foreignName: { type: String, required: true },
    foreignCredits: { type: Number, required: true, min: [0.5, 'Credits must be greater than zero'] },
    cfCode: { type: String, required: true },
    cfName: { type: String, required: true },
    cfCredits: { type: Number, required: true, min: [0.5, 'Credits must be greater than zero'] },
    isActive: { type: Boolean, default: true },
    result: { type: examResultSchema }
});

const learningAgreementSchema = new Schema<ILearningAgreement>({
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    decisionDate: { type: Date },
    reason: { type: String }
});

const transcriptSchema = new Schema<ITranscript>({
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

const modificationSchema = new Schema<IModification>({
    description: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    decisionDate: { type: Date },
    reason: { type: String },
    proposedMappings: [examMappingSchema],
    replacesMappingId: { type: Schema.Types.ObjectId },
    learningAgreementId: { type: Schema.Types.ObjectId }
});

const cancellationRequestSchema = new Schema<ICancellationRequest>({
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedAt: { type: Date, default: Date.now },
    decisionDate: { type: Date },
    decisionReason: { type: String }
});

// ─── Main Schema ────────────────────────────────────────────────────────

const mobilityApplicationSchema = new Schema<IMobilityApplication>({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lecturerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    academicYear: { type: String, required: true },
    mobilityPeriod: {
        type: String,
        enum: ['first_semester', 'second_semester', 'full_year'],
        required: true
    },
    status: {
        type: String,
        enum: ['created', 'awaiting_la_approval', 'pre_departure_completed',
               'mobility_in_progress', 'waiting_score_approval', 'closed', 'canceled'],
        required: true
    },
    arrivalDate: { type: Date },
    departureDate: { type: Date },
    mappings: [examMappingSchema],
    learningAgreements: [learningAgreementSchema],
    transcripts: [transcriptSchema],
    modifications: [modificationSchema],
    cancellationRequests: [cancellationRequestSchema]
}, {
    timestamps: true
});

export const MobilityApplication = model<IMobilityApplication>(
    'MobilityApplication',
    mobilityApplicationSchema
);