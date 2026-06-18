import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: Date;
  color: string;
  icon: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    savedAmount: { type: Number, default: 0 },
    targetDate: { type: Date, required: true },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: 'target' },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1 });

export const Goal = mongoose.model<IGoal>('Goal', goalSchema);

export interface IGoalContribution extends Document {
  userId: mongoose.Types.ObjectId;
  goalId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

const goalContributionSchema = new Schema<IGoalContribution>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

goalContributionSchema.index({ userId: 1, goalId: 1 });

export const GoalContribution = mongoose.model<IGoalContribution>(
  'GoalContribution',
  goalContributionSchema
);
