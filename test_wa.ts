import { WhatsappService } from './backend/src/modules/whatsapp/whatsapp.service';

async function run() {
  console.log('Starting WhatsappService standalone...');
  const wa = new WhatsappService();
  
  // Wait for connection
  await new Promise(r => setTimeout(r, 10000));
  
  console.log('Status: ', wa.status);
  
  try {
    console.log('Sending message...');
    await wa.sendMessage('6281234567890', 'Hello from isolated test!');
    console.log('Message sent!');
  } catch (e) {
    console.error('Error sending message: ', e);
  }
  
  process.exit();
}

run();
