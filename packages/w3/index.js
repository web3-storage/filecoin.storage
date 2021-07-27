import { Web3Storage, filesFromPath } from 'web3.storage'
import { writeFiles } from 'ipfs-car/unpack/fs'
import parseLink from 'parse-link-header'
import enquirer from 'enquirer'
import Conf from 'conf'
import ora from 'ora'
import fs from 'fs'

const API = 'https://api.web3.storage'

const config = new Conf({
  projectName: 'w3',
  projectVersion: getPkg().version
})

/**
 * Get a the API client config
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 */
function getClientOpts ({
  api = config.get('api') || API,
  token = config.get('token')
}) {
  if (!token) {
    console.log('! run `w3 token` to set an API token to use')
    process.exit(-1)
  }
  const endpoint = new URL(api)
  if (api !== API) {
    // note if we're using something other than prod.
    console.log(`⁂ using ${endpoint.hostname}`)
  }
  return { token, endpoint }
}

/**
 * Get a new API client configured either from opts or config
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 */
function getClient (opts) {
  return new Web3Storage(getClientOpts(opts))
}

/**
 * Set the token and optionally the api to use
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 */
export async function token ({ delete: del, token, api = API }) {
  if (del) {
    config.delete('token')
    config.delete('api')
    console.log('⁂ API token deleted')
    return
  }

  const url = new URL(api)
  if (!token) {
    const response = await enquirer.prompt({
      type: 'input',
      name: 'token',
      message: `Paste your API token for ${url.hostname}`
    })
    token = response.token
  }
  config.set('token', token)
  config.set('api', api)
  console.log('⁂ API token saved')
}

/**
 * Get data on Filecoin deals and IPFS pins that contain a given CID, as JSON.
 *
 * @param {string} cid the root CID to fetch
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 * @param {string} [opts.output] the path to write the files to
 */
export async function status (cid, opts) {
  const client = getClient(opts)
  const status = await client.status(cid)
  console.log(JSON.stringify(status, null, 2))
}

/**
 * Download and verify a file/directory by CID and write it to disk.
 *
 * @param {string} cid the root CID to fetch
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 * @param {string} [opts.output] the path to write the files to
 */
export async function get (cid, opts) {
  const client = getClient(opts)
  const res = await client.get(cid)
  await writeFiles(res.unixFsIterator(), opts.output)
}

/**
 * Print out all the uploads in your account by data created
 *
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 * @param {number} [opts.size] number of results to return per page
 * @param {string} [opts.before] list items uploaded before this iso date string
 */
export async function list (opts) {
  let count = 0
  for await (const res of paginator(Web3Storage.list, opts)) {
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`)
    }
    const page = await res.json()
    if (page.length === 0) {
      console.log('⁂ No uploads!')
      console.log('⁂ Try out `w3 put <path to files>` to upload some')
      break
    }
    if (count === 0 && !opts.json && !opts.cid) {
      console.log(`  Content ID${Array.from(page[0].cid).slice(0, -10).fill(' ').join('')} Name`)
    }
    for (const item of page) {
      count++
      if (opts.json) {
        console.log(JSON.stringify(item))
      } else if (opts.cid) {
        console.log(item.cid)
      } else {
        console.log(`⁂ ${item.cid} ${item.name}`)
      }
    }
  }
}

async function * paginator (fn, opts) {
  const service = getClientOpts(opts)
  let res = await fn(service, opts)
  yield res
  let link = parseLink(res.headers.get('Link'))
  while (link && link.next) {
    res = await fn(service, link.next)
    yield res
    link = parseLink(res.headers.get('Link'))
  }
}

/**
 * Add 1 or more files/directories to web3.storage
 *
 * @param {string} path the first file path to store
 * @param {object} opts
 * @param {string} [opts.api]
 * @param {string} [opts.token]
 * @param {string} [opts.wrap] wrap with directory
 * @param {string[]} opts._ additonal paths to add
 */
export async function put (path, opts) {
  const client = getClient(opts)
  const spinner = ora('Packing files').start()
  const paths = [path, ...opts._]
  const files = []
  let totalSize = 0
  let totalSent = 0
  for (const p of paths) {
    for await (const file of filesFromPath(p)) {
      totalSize += file.size
      files.push(file)
      spinner.text = `Packing ${files.length} file${files.length === 1 ? '' : 's'} (${filesize(totalSize)})`
    }
  }
  let rootCid = ''
  const root = await client.put(files, {
    wrapWithDirectory: opts.wrap,
    onRootCidReady: (cid) => {
      rootCid = cid
      spinner.stopAndPersist({ symbol: '#', text: `Packed ${files.length} file${files.length === 1 ? '' : 's'} (${filesize(totalSize)})` })
      console.log(`# ${rootCid}`)
      if (totalSize > 1024 * 1024 * 10) {
        spinner.start('Chunking')
      } else {
        spinner.start('Storing')
      }
    },
    onStoredChunk: (size) => {
      totalSent += size
      spinner.text = `Storing ${Math.round((totalSent / totalSize) * 100)}%`
    }
  })
  spinner.stopAndPersist({ symbol: '⁂', text: `Stored ${files.length} file${files.length === 1 ? '' : 's'}` })
  console.log(`⁂ https://dweb.link/ipfs/${root}`)
}

function filesize (bytes) {
  const size = bytes / 1024 / 1024
  return `${size.toFixed(1)}MB`
}

export function getPkg () {
  return JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))
}
