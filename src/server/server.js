//视频发送出错，需要继续分析
import path from 'path';
import multer from 'multer';
import express from 'express';
import { WebSocket } from 'ws';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 只保留一种导入方式，推荐使用 ES 模块的静态导入
import { processVideoFrames, readFileAsBase64 } from '../views/FileUpload/videoProcessor.js';

// 在代码开始处验证函数是否正确导入
console.log('正在检查视频处理模块...');
console.log('视频处理模块检查结果:', {
    processVideoFrames: typeof processVideoFrames,
    readFileAsBase64: typeof readFileAsBase64
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const router = express.Router();

// 确保上传目录存在
//const uploadDir = join(__dirname, '../../uploads');
//await fs.mkdir(uploadDir, { recursive: true });

// 使用异步方式配置 storage
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads');
        try {
            await fs.access(uploadDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(uploadDir, { recursive: true });
            }
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        cb(null, `${file.fieldname}-${timestamp}-${randomString}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'video') {
        if (!file.mimetype.startsWith('video/')) {
            return cb(new Error('只接受视频文件'));
        }
    } else if (file.fieldname === 'audio') {
        if (!file.mimetype.startsWith('audio/')) {
            return cb(new Error('只接受音频文件'));
        }
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 限制文件大小为 50MB
    }
}).fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]);

// 处理文件上传的路由
router.post('/upload', (req, res) => {
    console.log('接收到上传请求');

    upload(req, res, async function (err) {
        console.log('multer 处理完成');

        try {
            if (err) {
                console.error('文件上传错误:', err);
                throw new Error('文件上传错误: ' + err.message);
            }

            if (!req.files || !req.files.video || !req.files.audio) {
                console.error('文件缺失:', req.files);
                throw new Error('缺少必要的文件');
            }

            const videoFile = req.files.video[0];
            const audioFile = req.files.audio[0];

            console.log('接收到的文件信息:');
            console.log('视频文件:', {
                path: videoFile.path,
                size: videoFile.size,
                mimetype: videoFile.mimetype
            });
            console.log('音频文件:', {
                path: audioFile.path,
                size: audioFile.size,
                mimetype: audioFile.mimetype
            });

            // 检查文件是否真实存在
            console.log('检查文件是否存在:');
            //console.log('视频文件存在:', fs.existsSync(videoFile.path));
            //console.log('音频文件存在:', fs.existsSync(audioFile.path));

            console.log('开始调用 AI 处理...');
            const messages = await processFilesAndCallAI(videoFile.path, audioFile.path);

            // ... 其余代码保持不变
        } catch (error) {
            console.error('处理过程中出错:', error);
            res.status(500).json({
                success: false,
                message: '处理失败',
                error: error.message
            });
        }
    });
});


// 简单的文件类型验证函数
function isValidVideoFile(buffer) {
    // 检查 MP4 文件头
    const header = buffer.slice(4, 8);
    return header.toString() === 'ftyp';
}

function isValidAudioFile(buffer) {
    // 检查 WAV 文件头
    const header = buffer.slice(0, 4);
    return header.toString() === 'RIFF';
}

// 添加环境变量检查
const checkEnvironmentVariables = () => {
    const domain = process.env.VITE_APP_DOMAIN || 'https://api.zhipu.ai';
    const proxyPath = process.env.VITE_APP_PROXY_PATH || '/eastai';
    const apiKey = process.env.API_KEY || "d20c08612ef746beb7038a326131d475.cv71sxB0l7w8yOAO";

    console.log('环境变量检查:');
    console.log('VITE_APP_DOMAIN:', domain);
    console.log('VITE_APP_PROXY_PATH:', proxyPath);
    console.log('API_KEY:', apiKey ? '已设置' : '未设置');

    return { domain, proxyPath, apiKey };
};

async function processFilesAndCallAI(videoPath, audioPath) {
    try {
        console.log('开始 AI 处理流程...');

        // 修正环境变量的使用
        const domain = process.env.VITE_APP_DOMAIN || 'https://api.zhipu.ai';
        const proxyPath = process.env.VITE_APP_PROXY_PATH || '/eastai';  // 修正为正确的默认值
        const apiKey = process.env.VITE_APP_API_KEY;  // 使用相同的环境变量名

        // 检查环境变量
        console.log('环境变量检查:');
        console.log('DOMAIN:', domain);
        console.log('PROXY_PATH:', proxyPath);
        console.log('API_KEY 是否存在:', !!apiKey);

        const wsUrl = `${domain}${proxyPath}/v4/realtime?Authorization=${apiKey}`;
        console.log('WebSocket URL:', wsUrl.replace(/Authorization=.*$/, 'Authorization=***'));

        // 创建文件对象
        const videoFile = {
            name: videoPath.split('/').pop(),
            type: 'video/mp4',
            size: (await fs.stat(videoPath)).size,
            async arrayBuffer() {
                return await fs.readFile(videoPath);
            }
        };

        const audioFile = {
            name: audioPath.split('/').pop(),
            type: 'audio/wav',
            size: (await fs.stat(audioPath)).size,
            async arrayBuffer() {
                return await fs.readFile(audioPath);
            }
        };

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            let messages = [];

            ws.on('open', async () => {
                try {
                    console.log('WebSocket 连接已建立');

                    // 1. 发送会话配置
                    console.log('发送会话配置...');
                    ws.send(JSON.stringify({
                        type: 'session.update',
                        session: {
                            turn_detection: {
                                type: 'client_vad',
                            },
                            beta_fields: {
                                chat_mode: 'video_passive',
                            },
                            output_audio_format: "mp3",
                            input_audio_format: "wav",
                        }
                    }));

                    // 2. 处理视频帧
                    console.log('开始处理视频帧...');
                    const videoFrames = await processVideoFrames(videoFile, (progress) => {
                        console.log(`视频处理进度: ${progress}%`);
                    });
                    console.log(`提取到 ${videoFrames.length} 个视频帧`);

                    // 3. 发送视频帧 - 
                    console.log('开始发送视频帧...');
                    for (const frameData of videoFrames) {
                        ws.send(JSON.stringify({
                            type: 'video.append',
                            client_timestamp: 0,  // 使用固定时间戳
                            video_frame: frameData  // 直接发送 base64 字符串
                        }));
                    }
                    console.log('视频帧发送完成');

                    // 等待一下确保视频帧处理完成
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 4. 处理并发送音频数据
                    // 在 server.js 中修改音频文件处理
                    // 4. 处理并发送音频数据
                    console.log('开始处理音频...');
                    console.log('音频文件路径:', audioPath);

                    try {
                        await fs.access(audioPath);
                        const audioBase64 = await readFileAsBase64(audioFile);
                        console.log('音频数据准备完成');

                        // 发送音频开始标记
                        ws.send(JSON.stringify({
                            type: 'audio.start',
                            client_timestamp: Date.now()
                        }));

                        // 发送音频数据
                        ws.send(JSON.stringify({
                            type: 'audio.append',
                            client_timestamp: Date.now(),
                            audio: audioBase64,
                            role: 'user',
                            receive_voice: true
                        }));
                        console.log('音频数据发送完成');

                        // 发送音频结束标记
                        ws.send(JSON.stringify({
                            type: 'audio.end',
                            client_timestamp: Date.now()
                        }));

                    } catch (error) {
                        console.error('音频文件处理失败:', error);
                        throw error;
                    }

                    // 5. 发送提交指令
                    await new Promise(resolve => setTimeout(resolve, 500));
                    console.log('发送提交指令...');
                    ws.send(JSON.stringify({
                        type: 'commit',
                        client_timestamp: Date.now()
                    }));
                    console.log('提交指令发送完成');

                } catch (error) {
                    console.error('处理过程中出错:', error);
                    ws.close();
                    reject(error);
                }
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log('收到 WebSocket 消息:', message.type);

                    switch (message.type) {
                        case 'response.audio_txt':
                        case 'response.text':
                            console.log('收到响应内容:', message.delta);
                            messages.push(message.delta);
                            break;

                        case 'response.audio_done':
                            console.log('AI 处理完成');
                            ws.close();
                            break;

                        case 'error':
                            console.error('收到错误消息:', message.error);
                            ws.close();
                            reject(new Error(message.error?.message || '处理失败'));
                            break;
                    }
                } catch (err) {
                    console.error('处理消息时出错:', err);
                    ws.close();
                    reject(err);
                }
            });

            ws.on('error', (error) => {
                console.error('WebSocket 错误:', error);
                reject(error);
            });

            ws.on('close', () => {
                console.log('WebSocket 连接已关闭');
                if (messages.length > 0) {
                    resolve(messages);
                } else {
                    reject(new Error('处理完成但没有收到任何消息'));
                }
            });
        });
    } catch (error) {
        console.error('AI 处理过程中出错:', error);
        throw error;
    }
}
// 在上传路由中调用 AI 处理
router.post('/upload', (req, res) => {
    upload(req, res, async function (err) {
        console.log('开始处理上传请求');

        try {
            // 处理 multer 错误
            if (err instanceof multer.MulterError) {
                throw new Error(`文件上传错误: ${err.code}`);
            } else if (err) {
                throw new Error(`文件上传错误: ${err.message}`);
            }

            // 验证文件是否存在
            if (!req.files || !req.files.video || !req.files.audio) {
                throw new Error('缺少必要的文件');
            }

            const videoFile = req.files.video[0];
            const audioFile = req.files.audio[0];

            // 记录文件信息
            console.log('接收到的文件:');
            console.log('视频文件:', videoFile.path);
            console.log('音频文件:', audioPath);

            // 确认文件存在
            if (!fs.existsSync(videoFile.path) || !fs.existsSync(audioFile.path)) {
                throw new Error('文件保存失败');
            }

            console.log('开始调用 AI 处理...');
            const messages = await processFilesAndCallAI(videoFile.path, audioFile.path);
            console.log('AI 处理返回的消息:', messages);

            // 清理文件
            await Promise.all([
                fs.unlink(videoFile.path).catch(e => console.error('清理视频文件失败:', e)),
                fs.unlink(audioFile.path).catch(e => console.error('清理音频文件失败:', e))
            ]);

            res.json({
                success: true,
                message: '处理成功',
                data: { messages }
            });

        } catch (error) {
            console.error('处理过程中出错:', error);

            // 清理文件（如果存在）
            if (req.files) {
                await Promise.all(Object.values(req.files).flat().map(file =>
                    fs.unlink(file.path).catch(e =>
                        console.error(`清理文件 ${file.path} 失败:`, e)
                    )
                ));
            }

            res.status(500).json({
                success: false,
                message: '处理失败',
                error: error.message
            });
        }
    });
});

export default router;