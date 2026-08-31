import { Schema, model, Types } from 'mongoose';

// ─── Tipi ────────────────────────────────────────────────────────────────────

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

// ─── Interfacce subdocumenti ──────────────────────────────────────────────────

export interface IExamResult {
    score: string;          // stringa perché può essere "30L"
    examDate: Date;
    approvalStatus: ApprovalStatus;
}

export interface IExamMapping {
    foreignCode: string;
    foreignName: string;    // mancava
    foreignCredits: number;
    cfCode: string;
    cfName: string;         // era cdName — typo
    cfCredits: number;
    isActive: boolean;
    result?: IExamResult;   // embedded, opzionale
}

export interface ILearningAgreement {
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
    description: string;
    status: ApprovalStatus;
    decisionDate?: Date;
    reason?: string;
    proposedMappings: IExamMapping[];   // i mapping proposti vivono QUI
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
}

// ─── Schema subdocumenti ──────────────────────────────────────────────────────

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
    foreignCredits: { type: Number, required: true },
    cfCode: { type: String, required: true },
    cfName: { type: String, required: true },
    cfCredits: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    result: { type: examResultSchema }      // embedded dentro ExamMapping
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
    proposedMappings: [examMappingSchema]   // i mapping proposti sono embedded qui
});

// ─── Schema principale ────────────────────────────────────────────────────────

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
    modifications: [modificationSchema]
}, {
    timestamps: true
});

export const MobilityApplication = model<IMobilityApplication>(
    'MobilityApplication', 
    mobilityApplicationSchema
);