const fs = require('fs');
try {
    const content = fs.readFileSync('test_output.txt', 'utf16le');
    console.log(content);
} catch (e) {
    console.log('Error reading file:', e.message);
    // Try utf8 fallback
    try {
        const content2 = fs.readFileSync('test_output.txt', 'utf8');
        console.log(content2);
    } catch (e2) {
        console.log('Fallback failed');
    }
}
