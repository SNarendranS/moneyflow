import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as authService from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';
import User from '../models/User';

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await authService.registerUser(req.body);
    sendSuccess(res, result, 'Registration successful', 201);
  } catch (err: any) {
    if (err.message === 'Email already registered') return sendError(res, err.message, 409);
    next(err);
  }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err: any) {
    if (err.message === 'Invalid email or password') return sendError(res, err.message, 401);
    next(err);
  }
};

export const refresh = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err: any) {
    sendError(res, err.message, 401);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logoutUser(refreshToken);
    sendSuccess(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    sendSuccess(res, null, 'Password changed');
  } catch (err: any) {
    if (err.message === 'Current password is incorrect') return sendError(res, err.message, 400);
    next(err);
  }
};
