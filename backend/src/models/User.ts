import { Schema, model } from 'mongoose';

export type UserRole = 'student' | 'lecturer' | 'staff';

export interface IUser {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    matriculationNumber?: string;
}

const userSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['student', 'lecturer', 'staff'], required: true },
    // sparse: lecturers/staff never set this field, so it must not be
    // indexed for them (a plain unique index would treat every missing
    // value as null and reject the second lecturer/staff created)
    matriculationNumber: { type: String, unique: true, sparse: true }
}, {
    timestamps: true
});

export const User = model<IUser>('User', userSchema);