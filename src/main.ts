import './css/index.less';

document.addEventListener('copy', (event) => {
  const { clipboardData } = event;
  const selection = document.getSelection();
  if (!clipboardData || !selection) return;
  const msg = `${selection.toString()}

License: CC-BY-SA-4.0
Github: github.com/cong-min/resume
`;
  clipboardData.setData('text/plain', msg);
  event.preventDefault();
});
// 以下是一个模拟生成新加坡地址和邮政编码的示例函数
function generateSingaporeAddress() {
  const streetNames = ["Orchard Road", "Holland Road", "Bukit Timah Road", "Jurong East Street 31", "Bedok North Street 3"];
  const blockNumbers = Array.from({ length: 100 }, (_, i) => i + 1);
  const randomStreet = streetNames[Math.floor(Math.random() * streetNames.length)];
  const randomBlock = blockNumbers[Math.floor(Math.random() * blockNumbers.length)];
  const unitNumber = `#${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 100) + 1}`;
  // 新加坡邮政编码是6位数字
  const postalCode = Math.floor(100000 + Math.random() * 900000).toString();
  return {
    address: `${randomBlock} ${randomStreet}, ${unitNumber}`,
    postalCode
  };
}

const singaporeAddress = generateSingaporeAddress();
console.log(singaporeAddress.address);
console.log(singaporeAddress.postalCode);

