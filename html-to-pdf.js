const puppeteer = require('puppeteer');
const path = require('path');

const resumes = [
  {
    htmlFileName: 'index.html',
    pdfFileName: '字节跳动-全栈工程师-于子俊.pdf',
  },
  {
    htmlFileName: 'web-frontend.html',
    pdfFileName: '字节跳动-Web前端工程师-于子俊.pdf',
  },
];

async function generatePDF() {
  console.log('Starting PDF generation...');
  let browser = null;

  try {
    // 启动浏览器，添加超时设置，使用系统已安装的 Chrome
    browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      timeout: 60000, // 浏览器启动超时设置为60秒
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // 添加无沙箱模式，提高稳定性
    });

    for (const resume of resumes) {
      const page = await browser.newPage();
      const htmlPath = path.resolve(__dirname, resume.htmlFileName);
      console.log(`Loading HTML file: ${htmlPath}`);

      // 调整等待策略，使用domcontentloaded而不是networkidle2，提高速度
      await page.goto(`file://${htmlPath}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000, // 页面加载超时设置为60秒
      });

      // 等待页面完全渲染
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 生成PDF
      console.log(`Generating PDF: ${resume.pdfFileName}`);
      await page.pdf({
        path: resume.pdfFileName,
        width: 746,
        height: 1101,
        printBackground: true,
      });

      await page.close();
    }

    await browser.close();
    console.log('PDF generated successfully.');
  } catch (error) {
    console.error('Error generating PDF:', error.message);
    // 确保浏览器关闭
    if (browser) {
      await browser.close();
    }
  }
}

generatePDF().catch(console.error);
