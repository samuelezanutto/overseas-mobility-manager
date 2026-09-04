import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import institutionRoutes from './routes/institutions';
import applicationRoutes from './routes/applications';
import userRoutes from './routes/users';
import { seedInstitutions, seedUsers } from './seed';

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/institutions', institutionRoutes);
app.use('/applications', applicationRoutes);
app.use('/users', userRoutes);
app.get('/', (req, res) => {
    res.json({ message: 'Backend is running' });
});

// a rejected upload (oversized file, wrong field, malformed multipart body)
// throws before reaching any route handler; report it as JSON like every
// other error instead of falling through to Express's default HTML page
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err?.name === 'MulterError') {
        return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error' });
});

connectDB().then(async () => {
    await seedInstitutions();
    await seedUsers();
    app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
});