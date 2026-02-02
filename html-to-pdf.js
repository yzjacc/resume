const puppeteer = require('puppeteer');
const path = require('path');

async function generatePDF() {
  console.log('Starting PDF generation...');
  let browser = null;

  try {
    // 启动浏览器，添加超时设置
    browser = await puppeteer.launch({
      timeout: 60000, // 浏览器启动超时设置为60秒
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // 添加无沙箱模式，提高稳定性
    });

    const page = await browser.newPage();

    // 设置页面大小为A4
    await page.setViewport({ width: 827, height: 1170 });

    // 加载本地index.html文件
    const htmlPath = path.resolve(__dirname, 'index.html');
    console.log(`Loading HTML file: ${htmlPath}`);

    // 调整等待策略，使用domcontentloaded而不是networkidle2，提高速度
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000 // 页面加载超时设置为60秒
    });

    // 等待页面完全渲染
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 生成PDF
    console.log('Generating PDF...');
    await page.pdf({
      path: 'resume.pdf',
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });

    await browser.close();
    console.log('PDF generated successfully: resume.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error.message);
    // 确保浏览器关闭
    if (browser) {
      await browser.close();
    }
  }
}

generatePDF().catch(console.error);
