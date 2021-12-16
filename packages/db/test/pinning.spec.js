/* eslint-env mocha, browser */
import assert from 'assert'
import { normalizeCid } from '../../api/src/utils/normalize-cid'
import { DBClient } from '../index'
import { createUpload, createUser, createUserAuthKey, token } from './utils.js'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as pb from '@ipld/dag-pb'
/* global crypto */

const pinRequestTable = 'pa_pin_request'

/**
 * @param {number} code
 * @returns {Promise<string>}
 */
async function randomCid (code = pb.code) {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  const hash = await sha256.digest(bytes)
  return CID.create(1, code, hash).toString()
}

/**
 *
 * @param {*} pinRequestOutput
 * @param {object} opt
 * @param {boolean} [opt.withContent]
 */
const assertCorrectPinRequestOutputTypes = (pinRequestOutput) => {
  assert.ok(typeof pinRequestOutput._id === 'string', '_id should be a string')
  assert.ok(typeof pinRequestOutput.requestedCid === 'string', 'requestedCid should be a string')
  assert.ok(Array.isArray(pinRequestOutput.pins), 'pin should be an array')
  assert.ok(Date.parse(pinRequestOutput.created), 'created should be valid date string')
  assert.ok(Date.parse(pinRequestOutput.updated), 'updated should be valid date string')
  assert.ok(typeof pinRequestOutput.contentCid === 'string', 'contentCid should be a string')
}

describe('Pin Request', () => {
  /** @type {DBClient & {_client: import('@supabase/postgrest-js').PostgrestClient }} */
  const client = (new DBClient({
    endpoint: 'http://127.0.0.1:3000',
    token
  }))
  let user
  let authKey
  /**
   * @type {import('../db-client-types').PAPinRequestUpsertInput}
   */
  let aPinRequestInput

  /**
   * @type {import('../db-client-types').PAPinRequestUpsertOutput}
   */
  let aPinRequestOutput

  const cids = [
    'QmdA5WkDNALetBn4iFeSepHjdLGJdxPBwZyY47ir1bZGAK',
    'QmNvTjdqEPjZVWCvRWsFJA1vK7TTw1g9JP6we1WBJTRADM'
  ]

  const normalizedCids = cids.map(cid => normalizeCid(cid))

  const pins = [
    {
      status: 'Pinning',
      location: {
        peerId: '12D3KooWFe387JFDpgNEVCP5ARut7gRkX7YuJCXMStpkq714ziK6',
        peerName: 'web3-storage-sv15',
        region: 'region'
      }
    },
    {
      status: 'Pinning',
      location: {
        peerId: '12D3KooWFe387JFDpgNEVCP5ARut7gRkX7YuJCXMStpkq714ziK7',
        peerName: 'web3-storage-sv16',
        region: 'region'
      }
    }
  ]

  // Create user and auth key
  before(async () => {
    user = await createUser(client)
    authKey = await createUserAuthKey(client, parseInt(user._id, 10))
  })

  // Guarantee no Pin requests exist and create the ones needed for our tests
  before(async () => {
    // Make sure we don't have pinRequest and content
    await client._client.from(pinRequestTable).delete()
    const { count: countR } = await client._client.from(pinRequestTable).select('id', {
      count: 'exact'
    })
    assert.strictEqual(countR, 0, 'There are still requests in the db')

    aPinRequestInput = {
      requestedCid: cids[0],
      contentCid: normalizedCids[0],
      pins,
      authKey
    }

    aPinRequestOutput = await client.createPAPinRequest(aPinRequestInput)
  })

  describe('Create Pin', () => {
    it('creates a Pin Request', async () => {
      const savedPinRequest = await client.getPAPinRequest(parseInt(aPinRequestOutput._id, 10))
      assert.ok(savedPinRequest)
      assert.strictEqual(savedPinRequest._id, aPinRequestOutput._id)
    })

    it('returns the right object', async () => {
      assertCorrectPinRequestOutputTypes(aPinRequestOutput)
      assert.strictEqual(aPinRequestOutput.requestedCid, cids[0], 'requestedCid is not the one provided')
      assert.strictEqual(aPinRequestOutput.authKey, authKey, 'auth key is not the one provided')
      assert.strictEqual(aPinRequestOutput.contentCid, normalizedCids[0], 'contentCid is not the one provided')
    })

    it('creates content and pins', async () => {
      const { count: countContent } = await client._client
        .from('content')
        .select('cid', {
          count: 'exact'
        })
        .match({
          cid: normalizedCids[0]
        })
      assert.strictEqual(countContent, 1)

      const { count: countPins } = await client._client
        .from('pin')
        .select('id', {
          count: 'exact'
        })
        .match({
          content_cid: normalizedCids[0]
        })
      assert.strictEqual(countPins, pins.length)
    })

    it('returns the right pins', async () => {
      // Only checking statuses for simplicity
      const statuses = aPinRequestOutput.pins
        .map((p) => p.status)
      assert.deepStrictEqual(statuses, [pins[0].status, pins[1].status])
    })
  })

  describe('Get Pin', () => {
    let savedPinRequest

    before(async () => {
      savedPinRequest = await client.getPAPinRequest(parseInt(aPinRequestOutput._id, 10))
    })

    it('gets a Pin Request, if it exists', async () => {
      assert.ok(savedPinRequest)
    })

    it('returns the right object', async () => {
      assertCorrectPinRequestOutputTypes(savedPinRequest)
      assert.strictEqual(savedPinRequest.requestedCid, cids[0], 'requestedCid is not the one provided')
      assert.strictEqual(savedPinRequest.authKey, authKey, 'auth key is not the one provided')
      assert.strictEqual(savedPinRequest.contentCid, normalizedCids[0], 'contentCid is not the one provided')
    })

    it('returns the right pins', async () => {
      // Only checking statuses for simplicity
      const statuses = savedPinRequest.pins
        .map((p) => p.status)
      assert.deepStrictEqual(statuses, [pins[0].status, pins[1].status])
    })

    it('throws if does not exists', async () => {
      assert.rejects(client.getPAPinRequest(1000))
    })
  })

  describe('Get Pins', () => {
    const pins = [
      {
        status: 'Pinning',
        location: {
          peerId: '12D3KooWFe387JFDpgNEVCP5ARut7gRkX7YuJCXMStpkq714ziK6',
          peerName: 'web3-storage-sv15',
          region: 'region'
        }
      },
      {
        status: 'Pinning',
        location: {
          peerId: '12D3KooWFe387JFDpgNEVCP5ARut7gRkX7YuJCXMStpkq714ziK7',
          peerName: 'web3-storage-sv16',
          region: 'region'
        }
      }
    ]
    let pinRequestsInputs

    let userPinList
    let authKeyPinList
    let createdPinningRequests
    let cidWithContent
    let normalizeCidWithContent

    before(async () => {
      userPinList = await createUser(client)
      authKeyPinList = await createUserAuthKey(client, userPinList._id)
    })

    before(async () => {
      cidWithContent = await randomCid()
      normalizeCidWithContent = normalizeCid(cidWithContent)
      await createUpload(client, userPinList._id, authKeyPinList, normalizeCidWithContent, { pins: pins })
      pinRequestsInputs = [
        {
          name: 'horse',
          date: [2020, 0, 1],
          requestedCid: cidWithContent,
          cid: normalizeCidWithContent
        }, {
          name: 'capybara',
          date: [2020, 1, 1]
        }, {
          name: 'Camel',
          date: [2020, 2, 1]
        }, {
          name: 'Giant Panda Bear',
          date: [2020, 3, 1]
        }, {
          name: 'giant Schnoodle',
          date: [2020, 4, 1]
        }, {
          name: 'giant worm',
          date: [2020, 5, 1]
        }, {
          name: 'Zonkey Schnoodle',
          date: [2020, 6, 1]
        }, {
          name: 'Zorse',
          date: [2020, 7, 1]
        }, {
          date: [2020, 8, 1]
        }, {
          name: '',
          date: [2020, 9, 1]
        }, {
          name: 'Bear',
          date: [2020, 10, 1]
        }
      ]
      createdPinningRequests = await Promise.all(pinRequestsInputs.map(async (item) => {
        const requestedCid = item.requestedCid || await randomCid()
        const normalizedCid = item.cid || normalizeCid(requestedCid)

        return client.createPAPinRequest({
          ...(item.name) && { name: item.name },
          authKey: authKeyPinList,
          requestedCid: requestedCid,
          contentCid: normalizedCid,
          pins
        })
      }))
    })

    it('limits the results to 10', async () => {
      const { results: prs } = await client.listPAPinRequests(authKeyPinList)
      assert.strictEqual(prs.length, 10)
    })

    it('limits the results to the provided limit', async () => {
      const limit = 8
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        limit
      })
      assert.strictEqual(prs.length, limit)
    })

    it('returns only requests for the provided token', async () => {
      const { results: prs } = await client.listPAPinRequests('10')
      assert.strictEqual(prs.length, 0)
    })

    it('sorts by date', async () => {
      const { results: prs } = await client.listPAPinRequests(authKeyPinList)

      const sorted = prs.reduce((n, item) => n !== null && item.created <= n.created && item)
      assert(sorted)
    })

    it.skip('it filters items by provided status', async () => {
      // TODO(https://github.com/web3-storage/web3.storage/issues/797): status filtering is currently not working
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        status: ['Pinning']
      })

      assert.strictEqual(prs.length, 1)
      assert.strictEqual(createdPinningRequests._id, prs[0]._id)
    })

    it('filters items by provided cid', async () => {
      const cids = [createdPinningRequests[0].requestedCid, createdPinningRequests[1].requestedCid]
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        cid: cids
      })

      assert.strictEqual(prs.length, 2)
      assert(prs.map(p => p.requestedCid).includes(cids[0]))
      assert(prs.map(p => p.requestedCid).includes(cids[1]))
    })

    it('filters items by exact match by default', async () => {
      const name = 'capybara'
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        name
      })

      assert.strictEqual(prs.length, 1)
      prs.forEach(pr => {
        assert.strictEqual(pr.name, name)
      })
    })

    it('filters items by iexact match', async () => {
      const name = 'camel'
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        name,
        match: 'iexact'
      })

      assert.strictEqual(prs.length, 1)
      prs.forEach(pr => {
        assert.strictEqual(pr.name.toLowerCase(), name.toLowerCase())
      })
    })

    it('filters items by partial match', async () => {
      const name = 'giant'
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        name,
        match: 'partial'
      })

      assert.strictEqual(prs.length, 2)
      prs.forEach(pr => {
        assert(pr.name.includes(name))
      })
    })

    it('filters items by ipartial match', async () => {
      const name = 'giant'
      const { results: prs } = await client.listPAPinRequests(authKeyPinList, {
        name,
        match: 'ipartial'
      })

      assert.strictEqual(prs.length, 3)
      prs.forEach(pr => {
        assert(pr.name.toLowerCase().includes(name.toLowerCase()))
      })
    })

    it('filters items created before a date', async () => {
      const { results: pins } = await client.listPAPinRequests(authKeyPinList, {
        before: '2021-01-01T00:00:00.000000Z'
      })

      assert.strictEqual(pins.length, 0)
    })

    it('filters items created after a date', async () => {
      const { results: pins } = await client.listPAPinRequests(authKeyPinList, {
        after: '2021-01-01T00:00:00.000000Z',
        limit: 20
      })

      assert.strictEqual(pins.length, 11)
    })
  })

  describe('Delete Pin', () => {
    it('throws if the request id does not exist', async () => {
      assert.rejects(client.deletePAPinRequest(1000, authKey))
    })

    it('throws if the auth key does not belong to the pin request', async () => {
      assert.rejects(client.deletePAPinRequest(parseInt(aPinRequestOutput._id, 10), 'fakeAuth'))
    })

    it('returns the id of the deleted pin request', async () => {
      const aPinRequestOutputId = parseInt(aPinRequestOutput._id, 10)
      const pinRequest = await client.getPAPinRequest(aPinRequestOutputId)
      assert.ok(!pinRequest.deleted, 'is null')
      const deletedPinRequest = await client.deletePAPinRequest(aPinRequestOutputId, authKey)
      assert.ok(deletedPinRequest)
      assert.equal(deletedPinRequest._id, pinRequest._id)
    })

    it('does not select pin request after deletion', async () => {
      assert.rejects(client.getPAPinRequest(parseInt(aPinRequestOutput._id, 10)))
    })

    it('cannot delete a pin request which is already deleted', async () => {
      assert.rejects(client.deletePAPinRequest(parseInt(aPinRequestOutput._id, 10), authKey))
    })
  })
})
