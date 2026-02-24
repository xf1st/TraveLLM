const fs = require('fs');
const path = require('path');

const inputPath = 'd:\\sites\\vettka-claiude\\public\\result_chat_myszf.json';
const outputPath = 'd:\\sites\\vettka-claiude\\public\\myszf_style.json';

try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const messages = data.messages
        .filter(m => m.from === 'myszf' && typeof m.text === 'string' && m.text.length > 0)
        .map(m => m.text);
    
    // Take a diverse sample or just the last 500
    const sample = messages.slice(-500);
    
    fs.writeFileSync(outputPath, JSON.stringify(sample, null, 2));
    console.log(`Successfully extracted ${messages.length} messages. Saved 500 samples.`);
} catch (error) {
    console.error('Error processing JSON:', error);
}
