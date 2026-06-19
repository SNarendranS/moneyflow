import 'dotenv/config';
import { createApp } from './app';
import { connectDB } from './config/database';

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MoneyFlow API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start MoneyFlow API:', err);
    process.exit(1);
  });

export default app;
