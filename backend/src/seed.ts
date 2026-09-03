import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Institution } from './models/Institution';

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