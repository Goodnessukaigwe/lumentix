export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getBalance: () => Promise<void>;
}
