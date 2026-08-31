import { Schema, model } from 'mongoose';

export interface IInstitution {
    name: string;
    country: string;
    city: string;
}

const institutionSchema = new Schema<IInstitution>({
    name: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true }
}, {
    timestamps: true
});

export const Institution = model<IInstitution>('Institution', institutionSchema);