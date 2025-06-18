import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import uploadRouter from './server.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', uploadRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Environment:', {
        VITE_APP_DOMAIN: process.env.VITE_APP_DOMAIN,
        VITE_APP_PROXY_PATH: process.env.VITE_APP_PROXY_PATH,
        API_KEY: process.env.API_KEY ? '已设置' : '未设置'
    });
});