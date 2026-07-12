import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet, sepolia } from '@reown/appkit/networks';

export const projectId = '55d5b803894a033448da94ee51cc007e';

export const networks = [mainnet, sepolia] as [typeof mainnet, typeof sepolia];

export const ethersAdapter = new EthersAdapter();

export const appkitMetadata = {
  name: 'DonNation',
  description: 'Donations associatives avec reçu certifié',
  url: 'http://localhost:3000',
  icons: [],
};
