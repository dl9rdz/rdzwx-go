// scripts/fetch-egm96.js
const fs = require('fs');
const https = require('https');
const path = require('path');

module.exports = function (ctx) {
  const pluginRoot = ctx.opts.plugin.dir || ctx.opts.projectRoot;
  const dest = path.join(pluginRoot, 'src', 'android', 'assets', 'WW15MGH.DAC');

  if (fs.existsSync(dest)) {
    console.log('[fetch-egm96] WW15MGH.DAC already present, skipping download');
    return;
  }

  const url = 'https://download.osgeo.org/proj/vdatum/egm96_15/outdated/WW15MGH.DAC';

  console.log('[fetch-egm96] Downloading WW15MGH.DAC from', url);

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', err => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
};

