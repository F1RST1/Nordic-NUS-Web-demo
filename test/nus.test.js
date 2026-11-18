const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('connects without a device-name filter and sends/receives NUS data', async () => {
  const elements = new Map();
  function getElement(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        dataset: {},
        listeners: {},
        textContent: '',
        value: '',
        disabled: false,
        checked: id === 'append-newline',
        addEventListener(type, listener) {
          this.listeners[type] = listener;
        }
      });
    }
    return elements.get(id);
  }

  const writes = [];
  let notificationListener;
  let requestOptions;
  const txCharacteristic = {
    addEventListener(type, listener) {
      assert.equal(type, 'characteristicvaluechanged');
      notificationListener = listener;
    },
    async startNotifications() {}
  };
  const rxCharacteristic = {
    properties: { writeWithoutResponse: true },
    async writeValueWithoutResponse(chunk) {
      writes.push(Array.from(chunk));
    }
  };
  const service = {
    async getCharacteristic(uuid) {
      if (uuid === '6e400002-b5a3-f393-e0a9-e50e24dcca9e') return rxCharacteristic;
      if (uuid === '6e400003-b5a3-f393-e0a9-e50e24dcca9e') return txCharacteristic;
      throw new Error(`Unexpected characteristic: ${uuid}`);
    }
  };
  const device = {
    name: 'Test NUS device',
    gatt: {
      connected: false,
      async connect() {
        this.connected = true;
        return {
          async getPrimaryService(uuid) {
            assert.equal(uuid, '6e400001-b5a3-f393-e0a9-e50e24dcca9e');
            return service;
          }
        };
      }
    },
    addEventListener() {}
  };

  const context = {
    document: { getElementById: getElement },
    navigator: {
      bluetooth: {
        async requestDevice(options) {
          requestOptions = options;
          return device;
        }
      }
    },
    TextEncoder,
    TextDecoder
  };
  const source = fs.readFileSync(path.join(__dirname, '../static/nus.js'), 'utf8');
  vm.runInNewContext(source, context);

  await getElement('connect-button').listeners.click();
  assert.equal(requestOptions.acceptAllDevices, true);
  assert.equal('filters' in requestOptions, false);
  assert.deepEqual(Array.from(requestOptions.optionalServices), [
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
  ]);
  assert.equal(getElement('status').textContent, 'Connected');

  const message = 'x'.repeat(25);
  getElement('message').value = message;
  await getElement('send-button').listeners.click();
  assert.deepEqual(writes.map((chunk) => chunk.length), [20, 6]);
  assert.equal(getElement('message').value, '');

  const notification = new TextEncoder().encode('received');
  notificationListener({ target: { value: new DataView(notification.buffer) } });
  assert.match(getElement('terminal').textContent, /received/);
});
