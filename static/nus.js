(() => {
  const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  const NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  const connectButton = document.getElementById('connect-button');
  const sendButton = document.getElementById('send-button');
  const messageInput = document.getElementById('message');
  const status = document.getElementById('status');
  const deviceName = document.getElementById('device-name');
  const terminal = document.getElementById('terminal');
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let device;
  let rxCharacteristic;

  function writeTerminal(text) {
    terminal.textContent += text;
    terminal.scrollTop = terminal.scrollHeight;
  }

  function setConnected(connected) {
    status.textContent = connected ? 'Connected' : 'Not connected';
    status.dataset.connected = String(connected);
    connectButton.textContent = connected ? 'Disconnect' : 'Connect device';
    messageInput.disabled = !connected;
    sendButton.disabled = !connected;
  }

  function handleNotification(event) {
    const text = decoder.decode(event.target.value, { stream: true });
    writeTerminal(text);
  }

  function handleDisconnect() {
    rxCharacteristic = undefined;
    setConnected(false);
    writeTerminal('\n[Disconnected]\n');
  }

  async function connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is unavailable. Use a supported browser such as Chrome over HTTPS.');
    }

    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE]
    });
    device.addEventListener('gattserverdisconnected', handleDisconnect);
    deviceName.textContent = device.name || 'Unnamed BLE device';

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(NUS_SERVICE);
    rxCharacteristic = await service.getCharacteristic(NUS_RX);
    const txCharacteristic = await service.getCharacteristic(NUS_TX);
    txCharacteristic.addEventListener('characteristicvaluechanged', handleNotification);
    await txCharacteristic.startNotifications();

    setConnected(true);
    writeTerminal(`[Connected to ${deviceName.textContent}]\n`);
  }

  async function sendMessage() {
    if (!rxCharacteristic) {
      throw new Error('Connect to a NUS device before sending a message.');
    }

    const suffix = document.getElementById('append-newline').checked ? '\n' : '';
    const data = encoder.encode(messageInput.value + suffix);
    const write = async (chunk) => {
      if (rxCharacteristic.properties.writeWithoutResponse &&
          typeof rxCharacteristic.writeValueWithoutResponse === 'function') {
        await rxCharacteristic.writeValueWithoutResponse(chunk);
      } else if (rxCharacteristic.properties.write &&
                 typeof rxCharacteristic.writeValueWithResponse === 'function') {
        await rxCharacteristic.writeValueWithResponse(chunk);
      } else if (rxCharacteristic.properties.write ||
                 rxCharacteristic.properties.writeWithoutResponse) {
        await rxCharacteristic.writeValue(chunk);
      } else {
        throw new Error('The NUS RX characteristic does not support writing.');
      }
    };

    if (!rxCharacteristic.properties.write && !rxCharacteristic.properties.writeWithoutResponse) {
      throw new Error('The NUS RX characteristic does not support writing.');
    }
    for (let offset = 0; offset < data.length; offset += 20) {
      await write(data.slice(offset, offset + 20));
    }
    writeTerminal(`> ${messageInput.value}${suffix}`);
    messageInput.value = '';
  }

  connectButton.addEventListener('click', async () => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
      return;
    }

    try {
      await connect();
    } catch (error) {
      if (device?.gatt?.connected) {
        device.gatt.disconnect();
      }
      setConnected(false);
      writeTerminal(`[Connection error] ${error.message}\n`);
    }
  });

  sendButton.addEventListener('click', async () => {
    try {
      await sendMessage();
    } catch (error) {
      writeTerminal(`[Send error] ${error.message}\n`);
    }
  });

  document.getElementById('clear-button').addEventListener('click', () => {
    terminal.textContent = '';
  });
})();
