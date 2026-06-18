import mongoose, { Document, Schema } from 'mongoose';

export interface ITag extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  createdAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#6366f1' },
  },
  { timestamps: true }
);

tagSchema.index({ userId: 1 });

export default mongoose.model<ITag>('Tag', tagSchema);
