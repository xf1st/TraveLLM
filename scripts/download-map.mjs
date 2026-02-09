
import fs from 'fs';
import path from 'path';
import https from 'https';

const dest = path.join(process.cwd(), 'public', 'world.geojson');
const url = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

console.log(`Downloading ${url} to ${dest}...`);

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download: ${res.statusCode}`);
        process.exit(1);
    }

    const file = fs.createWriteStream(dest);
    res.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('Download complete.');
    });
}).on('error', (err) => {
    console.error('Error downloading file:', err.message);
    process.exit(1);
});
