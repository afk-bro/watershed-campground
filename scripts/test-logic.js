import { toLocalMidnight, getLocalToday } from '../lib/date';
// Mocking logic to match page.tsx implementation
// We only need to test the shared logic (date.ts) and the logic we copied to page.tsx

console.log('Modules imported successfully.');

function runTest() {
    // 1. Verify Helpers matching page.tsx logic
    const today = getLocalToday();
    console.log('Today (Local):', today.toString());

    // Allow 1 day tolerance
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    console.log('Limit (Yesterday):', yesterday.toString());

    // Test Case 1: Yesterday (Should PASS)
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const dateStr = yesterdayDate.getFullYear() + '-' + String(yesterdayDate.getMonth() + 1).padStart(2, '0') + '-' + String(yesterdayDate.getDate()).padStart(2, '0');

    const checkInDate = toLocalMidnight(dateStr);
    console.log(`Parsed Input '${dateStr}':`, checkInDate.toString());

    if (checkInDate < yesterday) {
        console.error('FAIL: Logic mistakenly rejects yesterday!');
        process.exit(1);
    } else {
        console.log('PASS: Yesterday accepted.');
    }

    // Test Case 2: 2 Days Ago (Should FAIL)
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateStr2 = twoDaysAgo.getFullYear() + '-' + String(twoDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + String(twoDaysAgo.getDate()).padStart(2, '0');

    const checkInDate2 = toLocalMidnight(dateStr2);
    console.log(`Parsed Input '${dateStr2}':`, checkInDate2.toString());

    if (checkInDate2 < yesterday) {
        console.log('PASS: 2 Days Ago is correctly rejected.');
    } else {
        console.error('FAIL: 2 Days Ago accepted!');
        process.exit(1);
    }
}

runTest();
