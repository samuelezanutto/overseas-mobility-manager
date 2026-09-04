import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { User } from './models/User';
import { Institution } from './models/Institution';
import { MobilityApplication } from './models/MobilityApplication';

export const seedInstitutions = async () => {
    const count = await Institution.countDocuments();
    if (count === 0) {
        await Institution.insertMany([
            { name: 'MIT', country: 'USA', city: 'Cambridge' },
            { name: 'ETH Zürich', country: 'Switzerland', city: 'Zürich' },
            { name: 'University of Tokyo', country: 'Japan', city: 'Tokyo' },
            { name: 'University of Melbourne', country: 'Australia', city: 'Melbourne' },
            { name: 'McGill University', country: 'Canada', city: 'Montreal' },
            { name: 'National University of Singapore', country: 'Singapore', city: 'Singapore' },
            { name: 'University of São Paulo', country: 'Brazil', city: 'São Paulo' },
            { name: 'Seoul National University', country: 'South Korea', city: 'Seoul' },
        ]);
        console.log('Institutions loaded');
    }
};

export const seedUsers = async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        const password = await bcrypt.hash('password123', 10);

        await User.insertMany([
            {
                email: 'mario.rossi@stud.unive.it',
                passwordHash: password,
                firstName: 'Mario',
                lastName: 'Rossi',
                role: 'student',
                matriculationNumber: '887234'
            },
            {
                email: 'giulia.bianchi@stud.unive.it',
                passwordHash: password,
                firstName: 'Giulia',
                lastName: 'Bianchi',
                role: 'student',
                matriculationNumber: '891567'
            },
            {
                email: 'luca.ferrari@stud.unive.it',
                passwordHash: password,
                firstName: 'Luca',
                lastName: 'Ferrari',
                role: 'student',
                matriculationNumber: '876543'
            },
            {
                email: 'prof.bergamasco@unive.it',
                passwordHash: password,
                firstName: 'Filippo',
                lastName: 'Bergamasco',
                role: 'lecturer',
            },
            {
                email: 'prof.focardi@unive.it',
                passwordHash: password,
                firstName: 'Riccardo',
                lastName: 'Focardi',
                role: 'lecturer',
            },
            {
                email: 'ufficio.overseas@unive.it',
                passwordHash: password,
                firstName: 'Ufficio',
                lastName: 'Overseas',
                role: 'staff',
            },
        ]);
        console.log('Users loaded');
        console.log('─────────────────────────────────────────');
        console.log('Test credentials (password: password123)');
        console.log('Student 1: mario.rossi@stud.unive.it');
        console.log('Student 2: giulia.bianchi@stud.unive.it');
        console.log('Student 3: luca.ferrari@stud.unive.it');
        console.log('Lecturer 1: prof.bergamasco@unive.it');
        console.log('Lecturer 2: prof.focardi@unive.it');
        console.log('Staff:      ufficio.overseas@unive.it');
        console.log('─────────────────────────────────────────');
    }
};

// minimal single-page PDF, reused as the "uploaded" document for every seeded
// application: a professor clicking download during the exam gets a real
// file back instead of a 404, without needing real Learning Agreements
const PLACEHOLDER_PDF = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n' +
    'trailer<</Root 1 0 R>>'
);

function ensurePlaceholderFile(): string {
    const uploadsDir = path.resolve('uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const absolutePath = path.join(uploadsDir, 'seed-placeholder-document.pdf');
    if (!fs.existsSync(absolutePath)) {
        fs.writeFileSync(absolutePath, PLACEHOLDER_PDF);
    }
    return 'uploads/seed-placeholder-document.pdf';
}

// preloads a handful of applications, one per status and spread across
// different host institutions/countries, so the Overseas Office dashboard
// (status counters, country/institution filters) is populated on first login
// instead of requiring the exam graders to create data by hand
export const seedApplications = async () => {
    const count = await MobilityApplication.countDocuments();
    if (count !== 0) {
        return;
    }

    const filePath = ensurePlaceholderFile();

    const userByEmail = async (email: string) => {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error(`Seed user not found: ${email}`);
        }
        return user;
    };
    const institutionByName = async (name: string) => {
        const institution = await Institution.findOne({ name });
        if (!institution) {
            throw new Error(`Seed institution not found: ${name}`);
        }
        return institution;
    };

    const [mario, giulia, luca, bergamasco, focardi] = await Promise.all([
        userByEmail('mario.rossi@stud.unive.it'),
        userByEmail('giulia.bianchi@stud.unive.it'),
        userByEmail('luca.ferrari@stud.unive.it'),
        userByEmail('prof.bergamasco@unive.it'),
        userByEmail('prof.focardi@unive.it'),
    ]);

    const [mit, eth, tokyo, mcgill, seoul, nus, saoPaulo] = await Promise.all([
        institutionByName('MIT'),
        institutionByName('ETH Zürich'),
        institutionByName('University of Tokyo'),
        institutionByName('McGill University'),
        institutionByName('Seoul National University'),
        institutionByName('National University of Singapore'),
        institutionByName('University of São Paulo'),
    ]);

    const mapping = (foreignCode: string) => ({
        foreignCode,
        foreignName: 'Introduction to Artificial Intelligence',
        foreignCredits: 6,
        cfCode: 'INF01',
        cfName: 'Intelligenza Artificiale',
        cfCredits: 6,
        isActive: true,
    });

    const learningAgreement = (status: 'pending' | 'approved') => ({
        filePath,
        uploadedAt: new Date(),
        status,
        ...(status === 'approved' ? { decisionDate: new Date() } : {}),
    });

    await MobilityApplication.insertMany([
        {
            studentId: mario._id, lecturerId: bergamasco._id, institutionId: mit._id,
            academicYear: '2026/2027', mobilityPeriod: 'first_semester', status: 'created',
            mappings: [mapping('CS101')],
        },
        {
            studentId: mario._id, lecturerId: focardi._id, institutionId: eth._id,
            academicYear: '2026/2027', mobilityPeriod: 'first_semester', status: 'awaiting_la_approval',
            mappings: [mapping('CS102')],
            learningAgreements: [learningAgreement('pending')],
        },
        {
            studentId: giulia._id, lecturerId: bergamasco._id, institutionId: tokyo._id,
            academicYear: '2026/2027', mobilityPeriod: 'full_year', status: 'pre_departure_completed',
            mappings: [mapping('CS103')],
            learningAgreements: [learningAgreement('approved')],
        },
        {
            studentId: giulia._id, lecturerId: focardi._id, institutionId: mcgill._id,
            academicYear: '2026/2027', mobilityPeriod: 'second_semester', status: 'mobility_in_progress',
            mappings: [mapping('CS104')],
            learningAgreements: [learningAgreement('approved')],
            arrivalDate: new Date('2027-01-10'), departureDate: new Date('2027-06-15'),
        },
        {
            studentId: mario._id, lecturerId: bergamasco._id, institutionId: seoul._id,
            academicYear: '2026/2027', mobilityPeriod: 'first_semester', status: 'waiting_score_approval',
            mappings: [mapping('CS105')],
            learningAgreements: [learningAgreement('approved')],
            transcripts: [{ filePath, uploadedAt: new Date() }],
            arrivalDate: new Date('2026-09-01'), departureDate: new Date('2027-01-31'),
        },
        {
            studentId: luca._id, lecturerId: bergamasco._id, institutionId: nus._id,
            academicYear: '2025/2026', mobilityPeriod: 'first_semester', status: 'closed',
            mappings: [{
                ...mapping('CS106'),
                result: { score: '28', examDate: new Date('2026-01-18'), approvalStatus: 'approved' },
            }],
            learningAgreements: [learningAgreement('approved')],
            transcripts: [{ filePath, uploadedAt: new Date() }],
            arrivalDate: new Date('2025-09-15'), departureDate: new Date('2026-01-20'),
        },
        {
            studentId: luca._id, lecturerId: focardi._id, institutionId: saoPaulo._id,
            academicYear: '2026/2027', mobilityPeriod: 'first_semester', status: 'canceled',
            cancellationRequests: [{
                reason: 'Rinuncia dello studente per motivi personali',
                status: 'approved', requestedAt: new Date(), decisionDate: new Date(),
            }],
        },
    ]);

    console.log('Sample applications loaded (one per status, across different countries/institutions)');
};