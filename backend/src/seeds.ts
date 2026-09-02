import { Institution } from './models/Institution';

const institutions = [
    { name: 'MIT', country: 'USA', city: 'Cambridge' },
    { name: 'ETH Zürich', country: 'Switzerland', city: 'Zürich' },
    { name: 'University of Tokyo', country: 'Japan', city: 'Tokyo' },
    { name: 'University of Melbourne', country: 'Australia', city: 'Melbourne' },
    { name: 'McGill University', country: 'Canada', city: 'Montreal' },
];

export const seedInstitutions = async () => {
    const count = await Institution.countDocuments();
    if (count === 0) {
        await Institution.insertMany(institutions);
        console.log('Istituzioni caricate');
    }
};