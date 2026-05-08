const API_URL = 'https://script.google.com/macros/s/AKfycbwOwMiNdtjMApWCAoFJz8pfbkThU2ty2SvAANp5IVF0PhkQT9gHblHEHS8y2eH4I7ur/exec';
fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ action: 'read', sheet: 'Invoices' }),
  redirect: 'follow'
})
  .then(res => res.json())
  .then(json => {
    if (json.data && json.data.length > 0) {
      console.log("Headers:", Object.keys(json.data[0]));
      console.log("Last item:", json.data[json.data.length - 1]);
    }
  });
