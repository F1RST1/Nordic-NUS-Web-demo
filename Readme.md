# Nordic UART Console

This web app connects to devices that expose the [Nordic UART Service (NUS)](https://github.com/NordicSemiconductor/ble-nus) over Web Bluetooth. It can send text to the device's RX characteristic and display text received from its TX characteristic.

## Use the console

Open the [live demo](https://f1rst1.github.io/cloudpets-web-bluetooth/) in a Web Bluetooth-compatible browser (for example, Chrome or Edge) over HTTPS. Select **Connect device**, choose a nearby device, and send or receive text. The chooser does not filter devices by name; the selected device must provide the Nordic UART Service.

The page uses these standard NUS UUIDs:

* Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
* RX (write): `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
* TX (notify): `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

## GitHub Pages

GitHub Actions checks the JavaScript, runs the tests, and deploys the site to GitHub Pages when changes are pushed to `master`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The older CloudPets audio codec utilities remain in the repository but are not used by this console.
