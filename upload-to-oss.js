const dotenv = require('dotenv');
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');

// 加载环境变量 - 使用绝对路径
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({
  path: envPath,
  override: true, // 覆盖已存在的环境变量
});
if (result.error) {
  console.error('Error loading .env file:', result.error);
  console.error('Env file path:', envPath);
  console.error('Env file exists:', fs.existsSync(envPath));
} else {
  console.log('Successfully loaded .env file from:', envPath);
  console.log('OSS_REGION:', process.env.OSS_REGION);
  console.log('OSS_ACCESS_KEY_ID:', process.env.OSS_ACCESS_KEY_ID);
  console.log('OSS_ACCESS_KEY_SECRET:', process.env.OSS_ACCESS_KEY_SECRET);
  console.log('OSS_BUCKET:', process.env.OSS_BUCKET);
}

async function uploadFile(ossFilePath, header) {
  console.log('开始上传文件到阿里云 OSS...');

  // 要上传的文件路径
  let filePath = path.resolve(__dirname, ossFilePath);
  // 规范化本地文件路径
  const localFilePath = path.normalize(filePath);
  // OSS 中的文件路径

  // 检查文件是否存在
  if (!fs.existsSync(localFilePath)) {
    console.error('文件不存在:', localFilePath);
    return;
  }

  try {
    // 从环境变量中获取访问凭证（需要设置OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET）
    const client = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-beijing',
      // 从环境变量中获取访问凭证
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      // 启用V4签名
      authorizationV4: true,
      // 从环境变量中获取Bucket名称
      bucket: process.env.OSS_BUCKET || 'pg12138',
    });

    // 自定义请求头
    const headers = {
      // 指定Object的存储类型
      'x-oss-storage-class': 'Standard',
      // 指定Object的访问权限
      'x-oss-object-acl': 'public-read',
      // 通过文件URL访问文件时，指定以附件形式下载文件
      'Content-Disposition': ossFilePath === 'resume.pdf' ? 'attachment' : 'inline',
      // 设置Object的标签，可同时设置多个标签
      'x-oss-tagging': 'Tag1=1&Tag2=2',
      // 指定PutObject操作时是否覆盖同名目标Object。此处设置为true，表示禁止覆盖同名Object
      'x-oss-forbid-overwrite': 'false',
      ...header,
    };

    // 上传文件
    const result = await client.put(ossFilePath, localFilePath, { headers });

    console.log(`文件上传完成: ${localFilePath} -> ${ossFilePath}`);
    // console.log('上传结果:', result);
    console.log('上传完成！');
  } catch (error) {
    console.log('上传失败，详细信息如下:');
    console.error(error);
    return;
  }
}

// 执行上传
uploadFile('index.html', {
  'Content-Type': 'text/html',
}).catch(console.error);
uploadFile('resume.pdf', {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'attachment',
}).catch(console.error);
