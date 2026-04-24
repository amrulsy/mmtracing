import { whatsappService } from './src/modules/whatsapp/whatsapp.service';

async function test() {
  console.log('Connecting...');
  
  // Wait for 5 seconds for initialization
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Status after 5s:', whatsappService.status);
  
  if (whatsappService.status === 'connected') {
    try {
      console.log('Sending message...');
      const [res] = await whatsappService['sock'].onWhatsApp('6285212345678');
      console.log('ON WHATSAPP RESULT:', res);
      await whatsappService.sendMessage('6285212345678', 'Test dari script');
      console.log('Sent successfully');
    } catch (e) {
      console.error('Send error:', e);
    }
  } else {
    console.log('Not connected. Cannot test send.');
  }

  process.exit(0);
}

test();
