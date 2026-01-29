const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function htmlToPdf() {
  const htmlPath = path.resolve(__dirname, 'index.html');
  const pdfPath = path.resolve(__dirname, 'resume.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML file not found:', htmlPath);
    return;
  }

  console.log('Converting HTML to PDF...');

  try {
    // 启动浏览器，使用无头模式
    const browser = await puppeteer.launch({
      headless: true,
      timeout: 60000 // 增加浏览器启动超时时间
    });
    const page = await browser.newPage();

    // 设置页面超时时间
    page.setDefaultTimeout(60000);

    // 加载本地 HTML 文件，使用更宽松的等待条件
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'domcontentloaded' // 只等待 DOM 加载完成
    });

    // 等待几秒钟，确保页面完全渲染
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 设置 PDF 选项
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    console.log('PDF generated successfully:', pdfPath);
  } catch (error) {
    console.error('Error generating PDF:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// 执行转换
htmlToPdf();
