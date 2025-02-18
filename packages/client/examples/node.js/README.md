# web3.storage Node.js examples

Examples for using the web3.storage client from Node.js.

- `put-files.js` - Adds web files to web3.storage
- `put-files-from-fs.js` - Adds files from your file system to web3.storage
- `put-car-from-fs.js` - Adds a Content Archive (CAR) file from your file system to web3.storage
- `put-car-dag-cbor.js` - Creates a Content Archive in memory from IPLD data and adds to web3.storage
- `put-and-retrieve-car-dag-json.ts` - Creates & pushes a Content Archive in memory from DAG-JSON IPLD data, retrieves and decodes it again

See the [Working with CARs guide](https://web3.storage/docs/how-tos/work-with-car-files/) on the [Web3.Storage documentation site](https://web3.storage/docs) for more context about the examples relating to Content Archives.

## Setup

Install dependencies:

```sh
npm install
```

Register an account at https://web3.storage and create a new API key.

## Running

```sh
node put-files.js --token=<YOUR_TOKEN>
node put-files-from-fs.js --token=<YOUR_TOKEN>
node put-car-from-fs.js --token=<YOUR_TOKEN>
node put-car-dag-cbor.js --token=<YOUR_TOKEN>
npx ts-node-esm put-and-retrieve-car-dag-json.ts --token=<YOUR_TOKEN>
```
