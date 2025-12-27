
// Pure JS test to verify the logic we implemented in page.tsx and lib/availability.ts

console.log('--- Logic Verification ---');

// 1. Manually define the logic we want to test (copy-paste from lib/date.ts logic)
function toLocalMidnight(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function getLocalToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// 2. Test Cases
const today = getLocalToday();
console.log('Today (Local):', today.toString());

// Yesterday Limit (Logic from Code)
// "const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);"
const limitInit = new Date(today);
limitInit.setDate(limitInit.getDate() - 1);
const limit = limitInit;

console.log('Lower Limit (Yesterday):', limit.toString());

// Case A: Input is 'Yesterday' -> Should PASS
const yesterdayInput = new Date(today);
yesterdayInput.setDate(yesterdayInput.getDate() - 1);
const dateStrA = yesterdayInput.getFullYear() + '-' + String(yesterdayInput.getMonth() + 1).padStart(2, '0') + '-' + String(yesterdayInput.getDate()).padStart(2, '0');
const parsedA = toLocalMidnight(dateStrA);

console.log(`Input '${dateStrA}' Parsed:`, parsedA.toString());
if (parsedA < limit) { // < Yesterday
    console.error('FAIL: Rejected valid yesterday date!');
    process.exit(1);
} else {
    console.log('PASS: Accepted yesterday date.');
}

// Case B: Input is '2 Days Ago' -> Should FAIL
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const dateStrB = twoDaysAgo.getFullYear() + '-' + String(twoDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + String(twoDaysAgo.getDate()).padStart(2, '0');
const parsedB = toLocalMidnight(dateStrB);

console.log(`Input '${dateStrB}' Parsed:`, parsedB.toString());

if (parsedB < limit) {
    console.log('PASS: Rejected old date correctly.');
} else {
    console.error('FAIL: Accepted old date!');
    process.exit(1);
}
