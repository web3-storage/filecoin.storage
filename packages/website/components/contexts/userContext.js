import React from 'react';
import { useQuery } from 'react-query';

import { getInfo, getStorage } from 'lib/api.js';
import AccountBlockedModal from 'components/account/accountBlockedModal/accountBlockedModal.js';
import { useAuthorization } from './authorizationContext.js';

/**
 * @typedef Tags
 * @property {boolean} [HasAccountRestriction]
 * @property {boolean} [HasPsaAccess]
 */

/**
 * @typedef {Object} Info
 * @property {Tags} tags
 */

/**
 * @typedef {Object} UserContextProps
 * @property {string} _id
 * @property {string} issuer
 * @property {string} name
 * @property {string} email
 * @property {string} github
 * @property {Info} info
 * @property {string} publicAddress
 * @property {string} created
 * @property {string} updated
 * @property {import('react-query').UseQueryResult<{
 *   usedStorage: {uploaded: number, psaPinned: number},
 *   storageLimitBytes: number
 * }>} storageData
 * @property {string} isLoadingStorage
 */

/**
 * @typedef {Object} UserProviderProps
 * @property {import('react').ReactNode} children
 * @property {boolean} loadStorage
 */

/**
 * User Context
 */
export const UserContext = React.createContext(/** @type {any} */ (undefined));

/**
 * User Info Hook
 *
 * @param {UserProviderProps} props
 */
export const UserProvider = ({ children, loadStorage }) => {
  const { isLoggedIn } = useAuthorization();
  const { data } = useQuery('get-info', getInfo, {
    enabled: isLoggedIn,
  });
  const storageData = useQuery('get-storage', getStorage, {
    enabled: isLoggedIn && loadStorage,
  });

  return (
    <UserContext.Provider value={{ ...data, storageData }}>
      <AccountBlockedModal hasAccountRestriction={data?.info?.tags?.['HasAccountRestriction']} />
      {children}
    </UserContext.Provider>
  );
};

/**
 * User hook
 *
 * @return {UserContextProps}
 */
export const useUser = () => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
