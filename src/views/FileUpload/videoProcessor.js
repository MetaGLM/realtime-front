//视频发送出错，需要继续分析
// src/views/FileUpload/videoProcessor.js
// 判断运行环境
const isNode = typeof window === 'undefined' || typeof document === 'undefined';

import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { file as tmpFile, dir as tmpDir } from 'tmp-promise';
import { join } from 'path';
import { createCanvas, loadImage } from 'canvas';

// 添加递归删除目录的辅助函数
async function removeDir(dir) {
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const path = join(dir, item);
      const stat = await fs.stat(path);
      if (stat.isDirectory()) {
        await removeDir(path);
      } else {
        await fs.unlink(path);
      }
    }
    await fs.rmdir(dir);
  } catch (error) {
    console.error('删除目录失败:', error);
    throw error;
  }
}

export const processVideoFrames = async (file, onProgress) => {
  if (isNode) {
    let videoPath = null;
    let framesDir = null;

    try {
      // 创建临时文件和目录
      const tmpVideoFile = await tmpFile({ postfix: '.mp4' });
      const tmpFramesDir = await tmpDir();
      videoPath = tmpVideoFile.path;
      framesDir = tmpFramesDir.path;

      // 写入视频文件
      const videoBuffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(videoPath, videoBuffer);

      // 提取视频帧
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            count: 1,
            folder: framesDir,
            filename: 'frame-%i.jpg',
            size: '640x?'
          })
          .on('end', async () => {
            try {
              // 读取生成的帧
              const frames = await fs.readdir(framesDir);
              // 在处理视频帧时，直接返回 base64 字符串
              const frameResults = [];
              for (let i = 0; i < frames.length; i++) {
                const framePath = join(framesDir, frames[i]);
                const frameBuffer = await fs.readFile(framePath);
                frameResults.push(frameBuffer.toString('base64'));  // 直接返回 base64 字符串
              }

              // 注释掉清理临时文件的代码
              /*
              try {
                  await fs.unlink(videoPath);
                  console.log('临时视频文件已删除');
                  await removeDir(framesDir);
                  console.log('临时帧目录已删除');
              } catch (cleanupError) {
                  console.error('清理临时文件失败:', cleanupError);
              }
              */

              resolve(frameResults);
            } catch (error) {
              console.error('处理视频帧时出错:', error);
              reject(error);
            }
          })
          .on('error', async (err) => {
            console.error('FFmpeg 错误:', err);
            // 注释掉错误处理中的清理代码
            /*
            try {
                if (videoPath) await fs.unlink(videoPath).catch(() => {});
                if (framesDir) await removeDir(framesDir).catch(() => {});
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
            */
            reject(err);
          });
      });
    } catch (error) {
      // 注释掉最外层错误处理中的清理代码
      /*
      try {
          if (videoPath) await fs.unlink(videoPath).catch(() => {});
          if (framesDir) await removeDir(framesDir).catch(() => {});
      } catch (cleanupError) {
          console.error('清理临时文件失败:', cleanupError);
      }
      */
      console.error('视频处理初始化错误:', error);
      throw error;
    }
  } else {
    // 浏览器环境代码保持不变...
  }
};


// 将文件转换为base64
// 音频处理函数保持不变
export const readFileAsBase64 = async (file, onProgress) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (isNode) {
      // Node.js 环境
      return Buffer.from(arrayBuffer).toString('base64');
    } else {
      // 浏览器环境
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          if (onProgress) onProgress(100);
          resolve(base64);
        };
        reader.readAsDataURL(new Blob([arrayBuffer]));
      });
    }
  } catch (error) {
    console.error('处理音频文件时出错:', error);
    throw error;
  }
};


