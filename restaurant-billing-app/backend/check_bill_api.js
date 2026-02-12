const http = require('http');

const billId = 54; // Use the bill known to be problematic/latest
const url = `http://localhost:8000/api/billing/bills/${billId}`;

console.log(`Fetching ${url}...`);

http.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("--- API Response ---");
            console.log("ID:", json.id);
            console.log("Bill Number:", json.bill_number);
            console.log("Items JSON Length:", json.items_json ? json.items_json.length : 'N/A');
            console.log("Items Legacy Length:", json.items ? json.items.length : 'N/A');

            if (json.items_json && json.items_json.length > 0) {
                console.log("Sample Item 0:", JSON.stringify(json.items_json[0], null, 2));
            }
        } catch (e) {
            console.error("Error parsing JSON:", e.message);
            console.log("Raw Data:", data);
        }
    });

}).on("error", (err) => {
    console.error("Error: " + err.message);
});
