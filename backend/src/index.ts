import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import institutionRoutes from './routes/institutions';
import applicationRoutes from './routes/applications';
import { seedInstitutions, seedUsers } from './seed';

const app = express();
const PORT = 3000;

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true
}));

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/institutions', institutionRoutes);
app.use('/applications', applicationRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Backend is running' });
});

connectDB().then(async () => {
    await seedInstitutions();
    await seedUsers();
    app.listen(PORT, () => {
        console.log(`Server in ascolto su http://localhost:${PORT}`);
    });
});