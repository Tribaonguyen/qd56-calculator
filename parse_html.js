const fs = require('fs');

function parse(file, outFile) {
  try {
    let txt = fs.readFileSync(file, 'utf8');
    txt = txt.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    txt = txt.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    txt = txt.replace(/<[^>]*>?/gm, ' ');
    txt = txt.replace(/\s+/g, ' ').trim();
    console.log(file, 'clean size:', txt.length);
    fs.writeFileSync(outFile, txt);
  } catch (e) {
    console.log(e.message);
  }
}

parse('C:\\\\Users\\\\Admin\\\\Downloads\\\\QUY ĐINH 56.html', 'QuyDinh56_Clean_1.txt');
parse('C:\\\\Users\\\\Admin\\\\Downloads\\\\QUY-ĐINH-56.html', 'QuyDinh56_Clean_2.txt');
