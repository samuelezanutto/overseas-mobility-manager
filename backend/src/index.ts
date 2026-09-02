import express from 'express';
import { connectDB } from './db';
import authRoutes from './routes/auth';

const app = express();
const PORT = 3000;

app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});

