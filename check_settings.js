
import fetch from 'node-fetch';

const API_URL = 'https://script.google.com/macros/s/AKfycbwOwMiNdtjMApWCAoFJz8pfbkThU2ty2SvAANp5IVF0PhkQT9gHblHEHS8y2eH4I7ur/exec';

async function check() {
  try {
    const res = await fetch(`${API_URL}?action=read&sheet=TelegramSettings`);
    const json = await res.json();
    console.log('TelegramSettings:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
