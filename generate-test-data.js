const fs = require('fs');

let content = '';
for (let i = 0; i < 200; i++) {
	content += `"test${i}@example.com","Test",1577836800000,"taga,tagb"\n`;
}
fs.writeFileSync('testdata.csv', content);
