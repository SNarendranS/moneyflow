import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not defined in environment');

  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
