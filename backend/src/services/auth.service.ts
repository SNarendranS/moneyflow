import crypto from 'crypto';
import User, { IUser } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { Category } from '../models/Category';
import { Subcategory } from '../models/Category';
import Account from '../models/Account';

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#f59e0b', subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Outside Food', 'Home Food'] },
  { name: 'Bills', icon: 'receipt', color: '#ef4444', subcategories: ['WiFi', 'Mobile Recharge', 'Electricity', 'Water', 'Gas'] },
  { name: 'Travel', icon: 'plane', color: '#3b82f6', subcategories: ['Flight', 'Hotel', 'Transport', 'Fuel'] },
  { name: 'Shopping', icon: 'shopping-bag', color: '#8b5cf6', subcategories: ['Clothing', 'Electronics', 'Groceries', 'Online'] },
  { name: 'Healthcare', icon: 'heart', color: '#ec4899', subcategories: ['Medicine', 'Doctor', 'Hospital'] },
  { name: 'Entertainment', icon: 'film', color: '#f97316', subcategories: ['Movies', 'Subscriptions', 'Games'] },
  { name: 'Family Support', icon: 'users', color: '#10b981', subcategories: ['Mother', 'Father', 'Sibling'] },
  { name: 'Investment', icon: 'trending-up', color: '#06b6d4', subcategories: ['SIP', 'Mutual Fund', 'Stock', 'FD'] },
];

export const seedUserDefaults = async (userId: string) => {
  for (const cat of DEFAULT_CATEGORIES) {
    const category = await Category.create({
      userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
    });
    for (const sub of cat.subcategories) {
      await Subcategory.create({ userId, categoryId: category._id, name: sub });
    }
  }
  await Account.create({
    userId,
    name: 'Savings Account',
    type: 'savings',
    openingBalance: 0,
    currentBalance: 0,
    color: '#10b981',
    icon: 'piggy-bank',
  });
};

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  currency?: string;
  timezone?: string;
}) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new Error('Email already registered');

  const user = await User.create(data);
  await seedUserDefaults(user._id.toString());

  const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
  const refreshToken = generateRefreshToken({ id: user._id.toString() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
  const refreshToken = generateRefreshToken({ id: user._id.toString() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt });

  return { user, accessToken, refreshToken };
};

export const refreshTokens = async (token: string) => {
  const stored = await RefreshToken.findOne({ token });
  if (!stored) throw new Error('Invalid refresh token');

  const decoded = verifyRefreshToken(token) as { id: string };
  const user = await User.findById(decoded.id);
  if (!user) throw new Error('User not found');

  await RefreshToken.deleteOne({ _id: stored._id });

  const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
  const newRefreshToken = generateRefreshToken({ id: user._id.toString() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await RefreshToken.create({ userId: user._id, token: newRefreshToken, expiresAt });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (refreshToken: string) => {
  await RefreshToken.deleteOne({ token: refreshToken });
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new Error('User not found');
  if (!(await user.comparePassword(currentPassword))) throw new Error('Current password is incorrect');
  user.password = newPassword;
  await user.save();
};

export const updateProfile = async (userId: string, data: Partial<IUser>) => {
  return User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
};
