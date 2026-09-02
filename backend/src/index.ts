import express from 'express';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import institutionRoutes from './routes/institutions';
import { seedInstitutions, seedUsers } from './seeds';
import mobilityApplicationRoutes from './routes/applications';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/applications', mobilityApplicationRoutes);
app.use('/institutions', institutionRoutes);

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

connectDB().then(async () => {
    await seedInstitutions();
    await seedUsers();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});

