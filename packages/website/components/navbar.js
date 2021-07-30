import Router from 'next/router'
import Link from 'next/link'
import { getMagic } from '../lib/magic.js'
import { useQueryClient } from 'react-query'
import Button from './button.js'

/**
 * Navbar Component
 *
 * @param {Object} props
 * @param {string} [props.bgColor]
 * @param {any} [props.user]
 * @param {boolean} props.isLoadingUser
 */
export default function Navbar({ bgColor = '', user, isLoadingUser }) {
  const queryClient = useQueryClient()
  async function logout() {
    await getMagic().user.logout()
    await queryClient.invalidateQueries('magic-user')
    Router.push('/')
  }

  return (
    <nav className={`${bgColor} w-full z-50`}>
      <div className="flex items-center justify-between py-3 layout-margins">
        <Link href="/">
          <a title="Web3 Storage" className="flex items-center">
            <img src="/w3storage-logo.svg" style={{ height: '1.8rem' }} />
            <span className="space-grotesk ml-2 text-w3storage-purple font-medium text-md hidden xl:inline-block">Web3.Storage</span>
          </a>
        </Link>
        <div className="flex items-center" style={{ minHeight: 52 }}>
          <Link href="https://docs.web3.storage/">
            <a className={`text-sm text-w3storage-purple font-bold no-underline hover:underline align-middle p-3 py-3 md:px-6 ${user ? '' : 'mr-6 md:mr-0'}`}>
              Docs
            </a>
          </Link>
          <Link href="/about">
            <a className={`text-sm text-w3storage-purple font-bold no-underline hover:underline align-middle p-3 md:px-6 hidden md:inline-block ${user ? '' : 'md:mr-6'}`}>
              About
            </a>
          </Link>
          {user ? (
            <>
              <Link href="/files">
                <a className="text-sm text-w3storage-purple font-bold no-underline hover:underline align-middle p-3 md:px-6">
                  Files
                </a>
              </Link>
              <Link href="/account">
                <a className="text-sm text-w3storage-purple font-bold no-underline hover:underline align-middle p-3 md:px-6 mr-3 md:mr-6">
                  Account
                </a>
              </Link>
            </>
          ) : null}
          {isLoadingUser
            ? null
            : user
              ? (
                <Button onClick={logout} id="logout" wrapperClassName="inline-block" variant="outlined">
                  Logout
                </Button>
                )
              : (
                <Button href="/login" id="login" wrapperClassName="inline-block">
                  Login
                </Button>
                )
          }
        </div>
      </div>
    </nav>
  )
}
